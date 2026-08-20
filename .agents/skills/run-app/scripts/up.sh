#!/usr/bin/env bash
#
# Brings up the whole local stack for the checkout it is run from and leaves
# the dev server running. Idempotent: a second run reuses the containers and
# the seeded database, so it costs seconds.
#
#   bash .agents/skills/run-app/scripts/up.sh [--slot N] [--no-seed]
#
# Prints the URL to hand the user on the last line, plus whether a usable
# session exists — without a session the user cannot get past the login
# redirect, and on a worktree port Discord OAuth cannot create one.
set -euo pipefail

CHECKOUT="$(git rev-parse --show-toplevel)"
cd "$CHECKOUT"

MAIN_CHECKOUT="$(git worktree list --porcelain | head -1 | cut -d' ' -f2-)"
SLOT=""
SEED=1

while [ $# -gt 0 ]; do
  case "$1" in
    --slot) SLOT="$2"; shift 2 ;;
    --no-seed) SEED=0; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------- port slot

if [ "$CHECKOUT" = "$MAIN_CHECKOUT" ]; then
  SLOT=0
elif [ -z "$SLOT" ]; then
  # Reuse the slot this checkout already claimed, else take the lowest free one.
  if [ -f "$CHECKOUT/.env" ] && grep -q SAM_PSQL_PORT "$CHECKOUT/.env"; then
    SLOT=$(( $(grep SAM_PSQL_PORT "$CHECKOUT/.env" | cut -d= -f2) - 5432 ))
  else
    for candidate in $(seq 1 20); do
      ports="( sport = :$((3000 + candidate)) or sport = :$((5432 + candidate)) \
or sport = :$((6001 + candidate)) or sport = :$((5210 + candidate)) \
or sport = :$((9000 + candidate)) or sport = :$((4242 + candidate)) )"
      if [ -z "$(ss -ltn "$ports" | tail -n +2)" ]; then SLOT=$candidate; break; fi
    done
  fi
fi
[ -n "$SLOT" ] || { echo "no free port slot" >&2; exit 1; }

APP_PORT=$((3000 + SLOT))
PSQL_PORT=$((5432 + SLOT))
echo "==> slot $SLOT (app :$APP_PORT, psql :$PSQL_PORT)"

# ------------------------------------------------------------------- config

# `packages/database/.env` is usually HARDLINKED to the main checkout's copy;
# editing in place would silently repoint the main stack. Always rewrite it.
write_fresh() { rm -f "$1"; cat > "$1"; }

if [ "$SLOT" -ne 0 ]; then
  write_fresh "$CHECKOUT/.env" <<EOF
SAM_PSQL_PORT=$PSQL_PORT
SAM_SOKETI_PORT=$((6001 + SLOT))
SAM_SOKETI_METRICS_PORT=$((9601 + SLOT))
SAM_COLLAB_PORT=$((5210 + SLOT))
SAM_RUSTFS_PORT=$((9000 + SLOT))
SAM_UNLEASH_PORT=$((4242 + SLOT))
EOF

  write_fresh "$CHECKOUT/pnpm-monorepo/packages/database/.env" <<EOF
DATABASE_URL="postgresql://postgres:admin@localhost:$PSQL_PORT/db"
EOF

  APP_ENV="$CHECKOUT/pnpm-monorepo/apps/app/.env"
  [ -f "$APP_ENV" ] || { echo "missing $APP_ENV — copy it from $MAIN_CHECKOUT" >&2; exit 1; }
  sed -i \
    -e "s|localhost:5432/db|localhost:$PSQL_PORT/db|" \
    -e "s|http://localhost:3000|http://localhost:$APP_PORT|" \
    -e "s|http://localhost:9000|http://localhost:$((9000 + SLOT))|" \
    -e "s|http://localhost:4242/api|http://localhost:$((4242 + SLOT))/api|" \
    -e "s|ws://localhost:5210|ws://localhost:$((5210 + SLOT))|" \
    "$APP_ENV"
  grep -q NEXT_PUBLIC_PUSHER_CHANNELS_PORT "$APP_ENV" \
    || printf '\nNEXT_PUBLIC_PUSHER_CHANNELS_PORT="%s"\n' "$((6001 + SLOT))" >> "$APP_ENV"
fi

# ------------------------------------------------------------------- docker

# --build is ~2s once the layers are cached and guarantees the collab image
# comes from THIS checkout's source, so it is not worth making conditional.
echo "==> starting containers"
if [ "$SLOT" -eq 0 ]; then
  docker start sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1 sam-unleash-1 >/dev/null
else
  docker compose up -d --build >/dev/null 2>&1
fi

until docker compose exec -T psql pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

psql_local() { docker compose exec -T psql psql -U postgres -d db "$@"; }

# --------------------------------------------------------------------- seed

if [ "$SLOT" -ne 0 ] && [ "$SEED" -eq 1 ]; then
  if [ "$(psql_local -tAc "SELECT to_regclass('public.\"User\"') IS NOT NULL")" != "t" ]; then
    echo "==> seeding from the main checkout's database"
    docker start sam-psql-1 >/dev/null
    until docker exec sam-psql-1 pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
    docker exec sam-psql-1 pg_dump -U postgres db | psql_local -q >/dev/null
  else
    echo "==> database already seeded, skipping"
  fi
fi

echo "==> applying pending migrations"
( cd "$CHECKOUT/pnpm-monorepo/packages/database" && corepack pnpm exec prisma migrate deploy 2>&1 | tail -1 )

# --------------------------------------------------------------- dev server

if curl -s -o /dev/null --max-time 2 "http://localhost:$APP_PORT/"; then
  echo "==> dev server already running"
else
  echo "==> starting the dev server"
  LOG="$(mktemp /tmp/sam-dev-XXXXXX.log)"
  ( cd "$CHECKOUT/pnpm-monorepo/apps/app" && PORT="$APP_PORT" nohup corepack pnpm run dev >"$LOG" 2>&1 & )
  for _ in $(seq 1 180); do
    grep -qE "Ready in|EADDRINUSE|Error:" "$LOG" 2>/dev/null && break
    sleep 1
  done
  grep -q "Ready in" "$LOG" || { echo "dev server failed to start; log: $LOG" >&2; tail -20 "$LOG" >&2; exit 1; }
  echo "    log: $LOG"
fi

STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$APP_PORT/")
[ "$STATUS" = "200" ] || { echo "smoke check returned $STATUS" >&2; exit 1; }

# ------------------------------------------------------------------ session

# Report this up front: no amount of stack tuning helps if the user cannot
# get past the login redirect, and on a worktree port Discord OAuth cannot
# mint a session (the callback is pinned to NEXTAUTH_URL).
SESSIONS=$(psql_local -tAc 'SELECT count(*) FROM "Session" WHERE expires > now()')

echo
echo "READY: http://localhost:$APP_PORT"
if [ "$SESSIONS" -gt 0 ]; then
  echo "session: $SESSIONS valid — the user should already be signed in"
else
  echo "session: NONE — the user cannot sign in on this port."
  echo "         See 'The user has no active session' in SKILL.md, or add"
  echo "         http://localhost:$APP_PORT/api/auth/callback/discord to the"
  echo "         Discord app's OAuth2 redirect URIs to remove the detour."
fi
