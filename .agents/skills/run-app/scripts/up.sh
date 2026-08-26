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
or sport = :$((6001 + candidate)) or sport = :$((9601 + candidate)) \
or sport = :$((5210 + candidate)) or sport = :$((9000 + candidate)) \
or sport = :$((4242 + candidate)) or sport = :$((4318 + candidate)) )"
      if [ -z "$(ss -ltn "$ports" | tail -n +2)" ]; then SLOT=$candidate; break; fi
    done
  fi
fi
[ -n "$SLOT" ] || { echo "no free port slot" >&2; exit 1; }

APP_PORT=$((3000 + SLOT))
PSQL_PORT=$((5432 + SLOT))
SOKETI_PORT=$((6001 + SLOT))
SOKETI_METRICS_PORT=$((9601 + SLOT))
COLLAB_PORT=$((5210 + SLOT))
RUSTFS_PORT=$((9000 + SLOT))
UNLEASH_PORT=$((4242 + SLOT))
OTEL_COLLECTOR_PORT=$((4318 + SLOT))
echo "==> slot $SLOT (app :$APP_PORT, psql :$PSQL_PORT)"

# ------------------------------------------------------------------- config

# The .env files are often HARDLINKED to the main checkout's copies, so every
# write goes rm-then-create rather than truncating the inode in place — which
# would silently repoint the main stack at this checkout's database.
write_fresh() { rm -f "$1"; cat > "$1"; }

if [ "$SLOT" -ne 0 ]; then
  write_fresh "$CHECKOUT/.env" <<EOF
SAM_PSQL_PORT=$PSQL_PORT
SAM_SOKETI_PORT=$SOKETI_PORT
SAM_SOKETI_METRICS_PORT=$SOKETI_METRICS_PORT
SAM_COLLAB_PORT=$COLLAB_PORT
SAM_RUSTFS_PORT=$RUSTFS_PORT
SAM_UNLEASH_PORT=$UNLEASH_PORT
SAM_OTEL_COLLECTOR_PORT=$OTEL_COLLECTOR_PORT
EOF

  write_fresh "$CHECKOUT/pnpm-monorepo/packages/database/.env" <<EOF
DATABASE_URL="postgresql://postgres:admin@localhost:$PSQL_PORT/db"
EOF

  APP_ENV="$CHECKOUT/pnpm-monorepo/apps/app/.env"
  [ -f "$APP_ENV" ] || { echo "missing $APP_ENV — copy it from $MAIN_CHECKOUT" >&2; exit 1; }

  # Rewrite whatever port each key currently carries, not the slot-0 default:
  # otherwise a second run with a different --slot, or an .env copied from
  # another worktree, silently leaves the app pointing at the other stack.
  PATCHED="$(sed -E \
    -e "s|^(DATABASE_URL=.*localhost:)[0-9]+|\1$PSQL_PORT|" \
    -e "s|^(NEXTAUTH_URL=.*localhost:)[0-9]+|\1$APP_PORT|" \
    -e "s|^(S3_ENDPOINT=.*localhost:)[0-9]+|\1$RUSTFS_PORT|" \
    -e "s|^(S3_PUBLIC_URL=.*localhost:)[0-9]+|\1$RUSTFS_PORT|" \
    -e "s|^(UNLEASH_SERVER_API_URL=.*localhost:)[0-9]+|\1$UNLEASH_PORT|" \
    -e "s|^(COLLAB_URL=.*localhost:)[0-9]+|\1$COLLAB_PORT|" \
    -e "s|^(OTEL_EXPORTER_OTLP_ENDPOINT=.*localhost:)[0-9]+|\1$OTEL_COLLECTOR_PORT|" \
    -e "s|^(NEXT_PUBLIC_PUSHER_CHANNELS_PORT=\")[0-9]+|\1$SOKETI_PORT|" \
    "$APP_ENV")"
  printf '%s\n' "$PATCHED" | write_fresh "$APP_ENV"

  # Not present in the main checkout's .env; the app defaults to 6001.
  grep -q NEXT_PUBLIC_PUSHER_CHANNELS_PORT "$APP_ENV" \
    || printf '\nNEXT_PUBLIC_PUSHER_CHANNELS_PORT="%s"\n' "$SOKETI_PORT" >> "$APP_ENV"

  grep -qE "^NEXTAUTH_URL=\"?http://localhost:$APP_PORT" "$APP_ENV" \
    || { echo "NEXTAUTH_URL in $APP_ENV is not http://localhost:$APP_PORT — auth callbacks would break; fix it by hand" >&2; exit 1; }
fi

# ------------------------------------------------------------------ install

# The postinstall steps (Prisma client generation, `next typegen`) are what
# keep the app and tsc from failing with hundreds of bogus errors.
if [ ! -d "$CHECKOUT/pnpm-monorepo/node_modules" ]; then
  echo "==> installing dependencies (fresh checkout, ~45s)"
  ( cd "$CHECKOUT/pnpm-monorepo" && corepack pnpm install )
fi

# ------------------------------------------------------------------- docker

echo "==> starting containers"
if [ "$SLOT" -eq 0 ]; then
  # Deliberately `docker start` and not `docker compose up`: the database has
  # no named volume, so recreating psql would destroy the only copy of the
  # main checkout's dev data.
  docker start sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1 sam-unleash-1 >/dev/null
  # Only exists after someone worked on tracing here
  # (`docker compose up -d otel-collector`), thus never fatal.
  docker start sam-otel-collector-1 >/dev/null 2>&1 || true
else
  # --build is ~2s once the layers are cached and guarantees the collab image
  # comes from THIS checkout's source, so it is not worth making conditional.
  COMPOSE_LOG="$(mktemp /tmp/sam-compose-XXXXXX.log)"
  if ! docker compose up -d --build >"$COMPOSE_LOG" 2>&1; then
    echo "docker compose up failed; log: $COMPOSE_LOG" >&2
    tail -30 "$COMPOSE_LOG" >&2
    exit 1
  fi
fi

for attempt in $(seq 1 60); do
  docker compose exec -T psql pg_isready -U postgres >/dev/null 2>&1 && break
  [ "$attempt" -eq 60 ] && { echo "postgres did not become ready" >&2; exit 1; }
  sleep 1
done

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

# The seed dump carries whatever schema the main checkout's DB had, which is
# regularly behind the branch — so migrate on every run, in every checkout.
echo "==> applying pending migrations"
MIGRATE_LOG="$(mktemp /tmp/sam-migrate-XXXXXX.log)"
if ( cd "$CHECKOUT/pnpm-monorepo/packages/database" && corepack pnpm exec prisma migrate deploy ) >"$MIGRATE_LOG" 2>&1; then
  tail -1 "$MIGRATE_LOG"
else
  echo "prisma migrate deploy failed; log: $MIGRATE_LOG" >&2
  tail -20 "$MIGRATE_LOG" >&2
  exit 1
fi

# --------------------------------------------------------------- dev server

# A server already on the slot's port is only ours if it runs from this
# checkout — anything else would hand the user a different branch's app. Next
# must not fall through to another port either, since NEXTAUTH_URL is pinned.
LISTENER="$(ss -ltnp "( sport = :$APP_PORT )" 2>/dev/null | tail -n +2)"
if [ -n "$LISTENER" ]; then
  LISTENER_PID="$(printf '%s' "$LISTENER" | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2 || true)"
  LISTENER_CWD=""
  [ -n "$LISTENER_PID" ] && LISTENER_CWD="$(readlink -f "/proc/$LISTENER_PID/cwd" 2>/dev/null || true)"
  case "$LISTENER_CWD" in
    "$CHECKOUT" | "$CHECKOUT"/*)
      echo "==> dev server already running" ;;
    *)
      echo "port $APP_PORT is held by ${LISTENER_CWD:-a process this script cannot identify}," >&2
      echo "not by this checkout. Stop it or pass --slot N." >&2
      exit 1 ;;
  esac
else
  echo "==> starting the dev server"
  LOG="$(mktemp /tmp/sam-dev-XXXXXX.log)"
  # `setsid --fork` and not `nohup … &`: a plain background job stays a child of
  # this script, which then blocks on it and never returns — the whole point of
  # the script is that the caller gets its shell back.
  ( cd "$CHECKOUT/pnpm-monorepo/apps/app" \
    && PORT="$APP_PORT" setsid --fork corepack pnpm run dev >"$LOG" 2>&1 </dev/null )
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
  echo "         See 'Sessions' in SKILL.md, or add"
  echo "         http://localhost:$APP_PORT/api/auth/callback/discord to the"
  echo "         Discord app's OAuth2 redirect URIs to remove the detour."
fi
