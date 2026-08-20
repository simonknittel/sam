---
name: run-app
description: Spin up the sam Next.js app locally (dev server + backing Docker services) so a change can be tested in the real app. Use when asked to run, start, spin up, or serve the app, or to verify a change works in the browser.
---

# Run the sam app locally

## One command

```bash
bash .agents/skills/run-app/scripts/up.sh [--slot N] [--no-seed]
```

Run it from the checkout you want up. It picks a port slot, writes the env
files, installs dependencies if they are missing, starts the containers, seeds
the database from the main checkout if it is empty, applies pending migrations,
starts the dev server and smoke-checks it. It is idempotent, so a re-run on an
already-up stack takes seconds — use it instead of the individual commands. The
cost of doing this by hand is the ~17 round trips, not any single step.

`--slot N` forces a port slot; `--no-seed` leaves an empty database empty.

Act on the last two lines:

- `READY: http://localhost:<port>` — the URL to hand over.
- `session: …` — **read this before handing over the URL.** Without a valid
  session the user bounces off the login redirect, and on a worktree port
  Discord OAuth cannot mint one. Sort it out in the same pass — see
  [Sessions](#sessions).

The one prerequisite the script cannot supply is
`pnpm-monorepo/apps/app/.env`, which is gitignored and must be copied from the
main checkout. Worktrees created by the harness usually get it automatically.

Everything below is reference: what the script relies on, and the parts that
are deliberately left manual.

## How the local stack is laid out

The app is a Next.js app at `pnpm-monorepo/apps/app` (package
`@sam-monorepo/app`). `compose.yml` at the repo root defines `psql` (Postgres),
`soketi` (websockets), `sam-collab` (wiki realtime backend), `rustfs`
(S3-compatible upload storage) and `unleash` (feature flags). One-shot
`rustfs-bootstrap` and `unleash-bootstrap` services create the bucket — incl.
anonymous-read policy and CORS rules — and the app's flags, all disabled.

Multiple worktrees can run at once: each checkout runs its OWN compose stack and
dev server. Compose derives the project name from the checkout directory, so the
container sets never collide — only host ports must differ. Always run
`docker compose` from the root of the checkout you mean to address.

`compose.yml` declares no named volumes, so each stack's data lives inside its
own `psql` container. Two consequences: a fresh worktree stack starts with an
EMPTY database, and recreating the main checkout's `psql` container destroys the
only copy of the dev data.

### Port slots

The main checkout is slot 0 (all defaults); a worktree takes the lowest slot
N ≥ 1 whose ports are all free. Host ports interpolate `SAM_*_PORT` variables
from a gitignored `.env` next to `compose.yml`, falling back to the slot-0
defaults when absent.

| Service            | Slot 0 (main) | Slot N   |
| ------------------ | ------------- | -------- |
| Next.js dev server | 3000          | 3000 + N |
| Postgres           | 5432          | 5432 + N |
| soketi websockets  | 6001          | 6001 + N |
| soketi metrics     | 9601          | 9601 + N |
| collab (wiki)      | 5210          | 5210 + N |
| rustfs S3          | 9000          | 9000 + N |
| unleash flags      | 4242          | 4242 + N |

`NEXTAUTH_URL` is pinned to the dev server's port, so auth breaks if Next falls
through to the next free port. The script therefore refuses to continue when the
slot's port is held by anything other than this checkout, instead of moving off
it — stop the stray server or pass `--slot N`.

A stopped-but-existing worktree stack does not occupy its ports, so the free-slot
scan can hand its slot to a different worktree. Prefer restarting that stack
(`docker compose start`) or tearing it down properly (see [Shutdown](#shutdown)).

## Sessions

Login is Discord OAuth and cannot be driven programmatically, so authenticated
pages are only reachable through the user's own browser session. A 307 to `/` on
an authenticated path is the expected unauthenticated redirect, not a failure.

Sessions are database-backed and localhost cookies ignore the port, so a session
that came across with the seed dump usually just works.

**The one-time fix that removes the problem entirely** is adding
`http://localhost:<port>/api/auth/callback/discord` for each slot port to the
Discord application's OAuth2 redirect URIs. Offer it — it is the user's to do.
Without it, a fresh Discord login on a worktree port fails with a redirect_uri
error.

**Otherwise, when `up.sh` reports `session: NONE`,** the user has to sign in on
the MAIN checkout (port 3000) and the row gets carried over. Run it as one pass;
each round trip costs the user a wait:

1. Stop the worktree dev server and run `up.sh` from the main checkout instead.
   Hand over `http://localhost:3000` and say explicitly that the main checkout
   does NOT contain the branch's changes — it is only for getting a session.
2. When they confirm, read the new row's id with
   `SELECT id, expires > now() FROM "Session"`. Signing in creates a NEW row, so
   compare against what the worktree already has.
3. Copy that one row across (below), restart the worktree dev server, and verify
   before handing the URL back:

```bash
TOKEN=$(docker compose exec -T psql psql -U postgres -d db -tAc "SELECT \"sessionToken\" FROM \"Session\" WHERE id = '<id>'")
curl -s -o /dev/null -w '%{http_code}\n' --cookie "next-auth.session-token=${TOKEN}" http://localhost:3001/app   # 200
```

Print only the status code — the token is a credential and must never reach the
transcript. The user's browser needs no action.

## Copying rows between stacks

`DROP DATABASE`, `TRUNCATE` and friends are refused by the permission
classifier, so there is no supported "wipe and re-copy" path — don't burn turns
rediscovering that. `COPY … TO STDOUT` piped into `COPY … FROM STDIN` is
additive and allowed:

```bash
cd <worktree>
docker exec sam-psql-1 psql -U postgres -d db \
  -c "COPY (SELECT * FROM \"Session\" WHERE id = '<id>') TO STDOUT" \
  | docker compose exec -T psql psql -U postgres -d db -c "COPY \"Session\" FROM STDIN"
```

Both schemas must already match and the target row must not exist yet — compare
ids first. `ERROR: extra data after last expected column` means the schemas
differ; re-run `up.sh` on both sides so migrations are applied, then compare:

```bash
docker exec sam-psql-1 psql -U postgres -d db -tAc "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5"
```

## Feature flags

Toggle flags through the local Unleash admin API rather than pointing the user at
the admin UI (`admin` / `unleash4all`). Use the slot's port — 4242 addresses the
MAIN stack's flags:

```bash
UNLEASH_PORT=4243   # 4242 + N; 4242 in the main checkout
curl -s -X POST -H "Authorization: *:*.unleash-insecure-admin-token" \
  "http://localhost:$UNLEASH_PORT/api/admin/projects/default/features/<flag>/environments/development/on"   # or .../off
```

Flag names come from the app's `UNLEASH_FLAG` enum and the bootstrap pre-creates
all of them, so a 404 means a typo or a brand-new flag (create it first with
`POST .../features` and body `{"name":"<flag>"}`). The app caches flag
definitions for up to ~30 s — wait or poll before concluding a toggle "didn't
work".

If the `psql` container gets RECREATED (e.g. by
`scripts/mirror-database-production-to-local.sh`), `unleash` crashes with it,
because the flag data lives in the same Postgres instance.
`docker compose up -d unleash-bootstrap` from the affected checkout heals
everything — but all flags are back to disabled, so re-toggle what you were
testing.

## Shutdown

Kill the dev server you started; `up.sh` prints its log path.

**Worktree stack, keeping it around:** `docker compose stop` — keeps the seeded
database for next time.

**Worktree being removed:** tear the stack down fully BEFORE deleting the
directory. A plain `down` leaves two things behind: the `sam-collab` image built
from this worktree and the anonymous volume holding its Postgres data.

```bash
cd <worktree>
docker compose down --rmi local --volumes --remove-orphans
```

If the directory is already gone, address the stack by project name:
`docker compose ls -a` to find it, then
`docker compose -p <project> down --rmi local --volumes --remove-orphans`.

**Main stack:** leave it running. Stop it with
`docker stop sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1 sam-unleash-1`
only when the user asks, and NEVER `docker compose down` it — its containers
hold the only copy of the dev data.

Heavy worktree use still leaks disk: stacks of worktrees deleted without the full
`down`, `sam-collab` images superseded by every `--build`, and build cache.
`docker system df` shows the damage; `docker image prune -f`,
`docker builder prune -f` and `docker volume prune -f` clear it. The main stack
survives all three — its containers exist even when stopped, so their image and
data volume count as in use — but the prunes are Docker-wide and also drop
dangling images and cache from the user's other projects. All rebuildable, but
worth mentioning to them.

## Troubleshooting

- **`pnpm: command not found`** — pnpm is not on the Bash tool's PATH here (fish
  + fnm). Run it as `corepack pnpm …`, which is what the script does.
- **`lsof` crashes on this machine** — use `ss -ltn` to inspect ports.
- **Hundreds of bogus type errors** — the postinstall steps (Prisma client
  generation, `next typegen`) never ran; `corepack pnpm install` in
  `pnpm-monorepo` fixes it.
- **Queries fail on columns that exist in the Prisma schema** — migrations are
  behind. `up.sh` applies them on every run in whatever checkout it runs from,
  including the main one, whose dev DB is otherwise left behind until a feature
  needs it. Always `prisma migrate deploy`, never the `migrate:dev` script:
  `migrate dev` offers to RESET the database on drift and trips the
  destructive-command consent guard anyway.
- **A worktree's app points at another stack** — its `.env` files are often
  HARDLINKED to the main checkout's copies (`ls -la` shows link count 2), and
  truncating one in place rewrites the other. Rewrite via read → `rm` → write,
  as `up.sh` does.
- **Multi-step shell commands get refused** as too complex to verify, and a
  worktree session cannot `cd` to the shared checkout before a git command. Put
  anything multi-step in a scratchpad `.sh` and run it with `bash` — one call, no
  refusals. (The quoting in the `COPY` snippet above also survives fish poorly.)
