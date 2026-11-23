#!/usr/bin/env bash
#
# Brings up the whole local stack for the checkout it is run from and leaves
# the dev server running. Idempotent: a second run reuses the containers and
# the seeded database, so it costs seconds.
#
#   bash .agents/skills/run-app/scripts/up.sh [--slot N] [--no-seed]
#
# Prints the URL to hand the user on the last lines, plus how to log in.
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
or sport = :$((4242 + candidate)) or sport = :$((4318 + candidate)) \
or sport = :$((3100 + candidate)) or sport = :$((5220 + candidate)) )"
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
GRAFANA_PORT=$((3100 + SLOT))
RELAY_PORT=$((5220 + SLOT))
echo "==> slot $SLOT (app :$APP_PORT, psql :$PSQL_PORT)"

# ------------------------------------------------------------------- config

# The .env files are often HARDLINKED to the main checkout's copies, so every
# write goes rm-then-create rather than truncating the inode in place — which
# would silently repoint the main stack at this checkout's database.
write_fresh() { rm -f "$1"; cat > "$1"; }

# Writes the KEY=value lines from stdin into an env file and keeps its other
# lines, for example SAM_GRAFANA_ADMIN_PASSWORD in the root .env.
set_env_lines() {
  local file="$1" lines keys kept=""
  lines="$(cat)"
  keys="$(printf '%s\n' "$lines" | cut -d= -f1 | paste -sd'|')"
  [ -f "$file" ] && kept="$(grep -vE "^($keys)=" "$file" || true)"
  { [ -n "$kept" ] && printf '%s\n' "$kept"; printf '%s\n' "$lines"; } | write_fresh "$file"
}

APP_ENV="$CHECKOUT/pnpm-monorepo/apps/app/.env"

if [ "$SLOT" -ne 0 ]; then
  set_env_lines "$CHECKOUT/.env" <<EOF
SAM_PSQL_PORT=$PSQL_PORT
SAM_SOKETI_PORT=$SOKETI_PORT
SAM_SOKETI_METRICS_PORT=$SOKETI_METRICS_PORT
SAM_COLLAB_PORT=$COLLAB_PORT
SAM_RUSTFS_PORT=$RUSTFS_PORT
SAM_UNLEASH_PORT=$UNLEASH_PORT
SAM_OTEL_COLLECTOR_PORT=$OTEL_COLLECTOR_PORT
SAM_GRAFANA_PORT=$GRAFANA_PORT
SAM_RELAY_PORT=$RELAY_PORT
EOF

  write_fresh "$CHECKOUT/pnpm-monorepo/packages/database/.env" <<EOF
DATABASE_URL="postgresql://postgres:admin@localhost:$PSQL_PORT/db"
EOF

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
    -e "s|^(STATISTICS_GRAFANA_URL=.*127\.0\.0\.1:)[0-9]+|\1$GRAFANA_PORT|" \
    -e "s|^(RELAY_URL=.*localhost:)[0-9]+|\1$RELAY_PORT|" \
    "$APP_ENV")"
  printf '%s\n' "$PATCHED" | write_fresh "$APP_ENV"

  # Not present in the main checkout's .env; the app defaults to 6001.
  grep -q NEXT_PUBLIC_PUSHER_CHANNELS_PORT "$APP_ENV" \
    || printf '\nNEXT_PUBLIC_PUSHER_CHANNELS_PORT="%s"\n' "$SOKETI_PORT" >> "$APP_ENV"

  grep -qE "^NEXTAUTH_URL=\"?http://localhost:$APP_PORT" "$APP_ENV" \
    || { echo "NEXTAUTH_URL in $APP_ENV is not http://localhost:$APP_PORT — auth callbacks would break; fix it by hand" >&2; exit 1; }
fi

# The local Grafana of the statistics page. In the main checkout, the append
# keeps the inode: hardlinked copies get the line too, and the up.sh run of
# their worktree changes the port.
if [ -f "$APP_ENV" ] && ! grep -q '^STATISTICS_GRAFANA_URL=' "$APP_ENV"; then
  printf '\nSTATISTICS_GRAFANA_URL="http://127.0.0.1:%s"\n' "$GRAFANA_PORT" >> "$APP_ENV"
fi

# The relay service of the Remote Control Program. The same append as above.
if [ -f "$APP_ENV" ] && ! grep -q '^RELAY_URL=' "$APP_ENV"; then
  printf '\nRELAY_URL="ws://localhost:%s"\n' "$RELAY_PORT" >> "$APP_ENV"
fi

# Grafana and the relay service verify the tokens of the app with the public
# key of EMBED_JWT_PRIVATE_KEY and the issuer of the app, and accept only the
# origin of the app.
APP_ENV_LINES="$(node "$SCRIPTS_DIR/app-env.mjs" "$APP_ENV")"
printf '%s\nSAM_APP_ORIGIN=http://localhost:%s\n' "$APP_ENV_LINES" "$APP_PORT" \
  | set_env_lines "$CHECKOUT/.env"

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
  # Deliberately `docker start` and not `docker compose up`: the main stack
  # stays as it is. Only a changed psql image in compose.yml gets a
  # recreation, which keeps the data (see the database section of
  # docs/setup-local-machine.md).
  PSQL_IMAGE="$(docker compose config --images psql)"
  if [ "$(docker inspect -f '{{.Config.Image}}' sam-psql-1 2>/dev/null || true)" != "$PSQL_IMAGE" ]; then
    echo "==> recreating psql with the image of compose.yml (the data stays)"
    PSQL_LOG="$(mktemp /tmp/sam-psql-XXXXXX.log)"
    if ! docker compose up --detach psql >"$PSQL_LOG" 2>&1; then
      echo "the recreation of psql failed; log: $PSQL_LOG" >&2
      tail -20 "$PSQL_LOG" >&2
      exit 1
    fi
  fi
  docker start sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1 sam-unleash-1 >/dev/null
  # Only exists after someone worked on tracing here
  # (`docker compose up -d otel-collector`), thus never fatal.
  docker start sam-otel-collector-1 >/dev/null 2>&1 || true
else
  # --build is ~2s once the layers are cached and guarantees the collab image
  # comes from THIS checkout's source, so it is not worth making conditional.
  # The relay service starts after the migrations (see below).
  mapfile -t SERVICES < <(docker compose config --services | grep -vx sam-relay)
  COMPOSE_LOG="$(mktemp /tmp/sam-compose-XXXXXX.log)"
  if ! docker compose up -d --build "${SERVICES[@]}" >"$COMPOSE_LOG" 2>&1; then
    echo "docker compose up failed; log: $COMPOSE_LOG" >&2
    tail -30 "$COMPOSE_LOG" >&2
    exit 1
  fi
fi

# TCP and not the Unix socket: the temporary server of the first start of a
# new data folder answers only on the socket, while it runs the init scripts.
for attempt in $(seq 1 60); do
  docker compose exec -T psql pg_isready --host 127.0.0.1 -U postgres >/dev/null 2>&1 && break
  [ "$attempt" -eq 60 ] && { echo "postgres did not become ready" >&2; exit 1; }
  sleep 1
done

psql_local() { docker compose exec -T psql psql -X -U postgres -d db "$@"; }

# The database keeps the version of TimescaleDB of an earlier image until this
# update (see the database section of docs/setup-local-machine.md).
# TimescaleDB wants the update as the first command of a new session, thus
# the check has its own session.
if [ -n "$(psql_local -tAc "SELECT 1 FROM pg_extension AS installed JOIN pg_available_extensions AS available ON available.name = installed.extname WHERE installed.extname = 'timescaledb' AND installed.extversion <> available.default_version")" ]; then
  echo "==> updating the extension timescaledb"
  psql_local --set ON_ERROR_STOP=1 -qc "ALTER EXTENSION timescaledb UPDATE"
fi

if [ "$SLOT" -eq 0 ]; then
  # `up` and not `docker start`: it makes the two containers in a main
  # checkout that is older than them, and applies a changed root .env.
  # --no-deps keeps psql as it is (see above). Compose waits until
  # grafana-bootstrap made the database role, thus before the migrations.
  GRAFANA_LOG="$(mktemp /tmp/sam-grafana-XXXXXX.log)"
  if ! docker compose up -d --no-deps grafana-bootstrap grafana >"$GRAFANA_LOG" 2>&1; then
    echo "the start of grafana failed; log: $GRAFANA_LOG" >&2
    tail -20 "$GRAFANA_LOG" >&2
    exit 1
  fi
fi

# --------------------------------------------------------------------- seed

if [ "$SLOT" -ne 0 ] && [ "$SEED" -eq 1 ]; then
  if [ "$(psql_local -tAc "SELECT to_regclass('public.\"User\"') IS NOT NULL")" != "t" ]; then
    echo "==> seeding from the main checkout's database"
    MAIN_PSQL_WAS_RUNNING="$(docker inspect -f '{{.State.Running}}' sam-psql-1)"
    docker start sam-psql-1 >/dev/null
    until docker exec sam-psql-1 pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
    # grafana-bootstrap made the schema `statistics` already. The database
    # of this stack has the extension timescaledb already (see
    # docs/mirror-database.md).
    docker exec sam-psql-1 pg_dump -U postgres --exclude-extension=timescaledb db \
      | sed 's/^CREATE SCHEMA statistics;$/CREATE SCHEMA IF NOT EXISTS statistics;/' \
      | psql_local -q >/dev/null
    # The dump is the only reason to start the database of the main checkout
    if [ "$MAIN_PSQL_WAS_RUNNING" != "true" ]; then
      docker stop sam-psql-1 >/dev/null
    fi
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

# -------------------------------------------------------------------- relay

# After the migrations, thus the relay service finds its tables. --no-deps
# keeps psql as it is (see above), and --build takes the image from the
# source of this checkout. The app works without the relay service (the
# browser runtime then works only on the machine), thus a failure only warns.
echo "==> starting the relay service"
RELAY_LOG="$(mktemp /tmp/sam-relay-XXXXXX.log)"
RELAY_STATUS=""
if docker compose up -d --build --no-deps sam-relay >"$RELAY_LOG" 2>&1; then
  for _ in $(seq 1 30); do
    RELAY_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$RELAY_PORT/health" || true)
    [ "$RELAY_STATUS" = "200" ] && break
    # A relay service that exited does not come back (restart: no)
    [ -n "$(docker compose ps --quiet --status running sam-relay)" ] || break
    sleep 1
  done
fi
if [ "$RELAY_STATUS" != "200" ]; then
  docker compose logs --tail 20 sam-relay >>"$RELAY_LOG" 2>&1 || true
  echo "WARNING: the relay service does not answer on :$RELAY_PORT/health; log: $RELAY_LOG" >&2
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

echo
echo "READY: http://localhost:$APP_PORT"
echo "login: 'Dev login' at the top of the login page (see Sessions in SKILL.md)"
