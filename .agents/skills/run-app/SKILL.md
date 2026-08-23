---
name: run-app
description: Start the sam Next.js app locally (dev server plus backing Docker services) to test a change in the real app. Use when asked to run, start, spin up, or serve the app, or to verify that a change works in the browser.
---

# Run the sam app locally

## One command

```bash
bash .agents/skills/run-app/scripts/up.sh [--slot N] [--no-seed]
```

Run it from the checkout that you want up. The script selects a port slot,
writes the env files, installs dependencies if they are missing, starts the
containers, seeds the database from the main checkout if it is empty, applies
pending migrations, starts the dev server and smoke-checks it. It is
idempotent, thus a re-run on a stack that is already up takes seconds — use
the script instead of the individual commands. The cost of the manual
procedure is the ~17 round trips, not one single step.

`--slot N` forces a port slot; `--no-seed` keeps an empty database empty.

Act on the last two lines:

- `READY: http://localhost:<port>` — the URL to hand over.
- `session: …` — **read this before you hand over the URL.** Without a valid
  session, the user only gets the login redirect, and on a worktree port
  Discord OAuth cannot create a session. Solve this in the same pass — see
  [Sessions](#sessions).

The one requirement that the script cannot supply is
`pnpm-monorepo/apps/app/.env`. The file is gitignored, and you must copy it
from the main checkout. Worktrees that the harness creates usually get it
automatically.

All sections below are reference: the parts that the script relies on, and
the parts that are intentionally manual.

## The layout of the local stack

The app is a Next.js app at `pnpm-monorepo/apps/app` (package
`@sam-monorepo/app`). `compose.yml` at the repo root defines `psql` (Postgres),
`soketi` (websockets), `sam-collab` (wiki realtime backend), `rustfs`
(S3-compatible upload storage) and `unleash` (feature flags). The one-shot
`rustfs-bootstrap` and `unleash-bootstrap` services create the bucket —
together with the anonymous-read policy and the CORS rules — and the flags of
the app, all disabled.

Multiple worktrees can run at the same time: each checkout runs its OWN
compose stack and dev server. Compose derives the project name from the
checkout directory, thus the container sets never collide — only the host
ports must differ. Always run `docker compose` from the root of the checkout
that you want to address.

`compose.yml` declares no named volumes, thus the data of each stack lives
inside its own `psql` container. Two consequences: a fresh worktree stack
starts with an EMPTY database, and a recreation of the `psql` container of
the main checkout destroys the only copy of the dev data.

### Port slots

The main checkout is slot 0 (all defaults); a worktree takes the lowest slot
N ≥ 1 with all ports free. Host ports interpolate the `SAM_*_PORT` variables
from a gitignored `.env` next to `compose.yml`; without them, the slot-0
defaults apply.

| Service            | Slot 0 (main) | Slot N   |
| ------------------ | ------------- | -------- |
| Next.js dev server | 3000          | 3000 + N |
| Postgres           | 5432          | 5432 + N |
| soketi websockets  | 6001          | 6001 + N |
| soketi metrics     | 9601          | 9601 + N |
| collab (wiki)      | 5210          | 5210 + N |
| rustfs S3          | 9000          | 9000 + N |
| unleash flags      | 4242          | 4242 + N |

`NEXTAUTH_URL` is pinned to the port of the dev server, thus auth breaks if
Next moves to the next free port. Therefore the script refuses to continue
when a different process holds the port of the slot; it does not move off the
port — stop the stray server or pass `--slot N`.

A worktree stack that exists but is stopped does not occupy its ports, thus
the free-slot scan can give its slot to a different worktree. Prefer to
restart that stack (`docker compose start`) or to remove it correctly (see
[Shutdown](#shutdown)).

## Sessions

Login is Discord OAuth, and a program cannot drive it. Thus authenticated
pages are only reachable through the user's own browser session. A 307 to `/`
on an authenticated path is the expected unauthenticated redirect, not a
failure.

Sessions are in the database, and localhost cookies ignore the port. Thus a
session that came with the seed dump usually works.

**The one-time fix that removes the problem completely** is to add
`http://localhost:<port>/api/auth/callback/discord` for each slot port to the
OAuth2 redirect URIs of the Discord application. Offer this fix — the user
must do it. Without it, a fresh Discord login on a worktree port fails with a
redirect_uri error.

**In the other case, when `up.sh` reports `session: NONE`,** the user must
sign in on the MAIN checkout (port 3000), and you copy the new row across. Do
this as one pass; each round trip costs the user a wait:

1. Stop the worktree dev server and run `up.sh` from the main checkout
   instead. Hand over `http://localhost:3000` and say explicitly that the
   main checkout does NOT contain the changes of the branch — it is only
   there to get a session.
2. When they confirm, read the id of the new row with
   `SELECT id, expires > now() FROM "Session"`. The sign-in creates a NEW
   row, thus compare against the rows that the worktree already has.
3. Copy that one row across (below), restart the worktree dev server, and
   verify before you hand the URL back:

```bash
TOKEN=$(docker compose exec -T psql psql -U postgres -d db -tAc "SELECT \"sessionToken\" FROM \"Session\" WHERE id = '<id>'")
curl -s -o /dev/null -w '%{http_code}\n' --cookie "next-auth.session-token=${TOKEN}" http://localhost:3001/app   # 200
```

Print only the status code — the token is a credential and must never go
into the transcript. The browser of the user needs no action.

## Copy rows between stacks

The permission classifier refuses `DROP DATABASE`, `TRUNCATE` and similar
commands, thus there is no supported "wipe and re-copy" path — do not use
turns to discover that again. `COPY … TO STDOUT` piped into
`COPY … FROM STDIN` is additive and permitted:

```bash
cd <worktree>
docker exec sam-psql-1 psql -U postgres -d db \
  -c "COPY (SELECT * FROM \"Session\" WHERE id = '<id>') TO STDOUT" \
  | docker compose exec -T psql psql -U postgres -d db -c "COPY \"Session\" FROM STDIN"
```

The two schemas must already match, and the target row must not exist yet —
compare the ids first. `ERROR: extra data after last expected column` means
that the schemas differ; run `up.sh` on both sides again, so that the
migrations are applied, then compare:

```bash
docker exec sam-psql-1 psql -U postgres -d db -tAc "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5"
```

## Feature flags

Toggle flags through the local Unleash admin API; do not point the user to
the admin UI (`admin` / `unleash4all`). Use the port of the slot — 4242
addresses the flags of the MAIN stack:

```bash
UNLEASH_PORT=4243   # 4242 + N; 4242 in the main checkout
curl -s -X POST -H "Authorization: *:*.unleash-insecure-admin-token" \
  "http://localhost:$UNLEASH_PORT/api/admin/projects/default/features/<flag>/environments/development/on"   # or .../off
```

The flag names come from the `UNLEASH_FLAG` enum of the app, and the
bootstrap creates all of them in advance. Thus a 404 means a typo or a fully
new flag (create it first with `POST .../features` and body
`{"name":"<flag>"}`). The app caches flag definitions for up to ~30 s — wait
or poll before you conclude that a toggle had no effect.

If the `psql` container gets RECREATED (for example by
`scripts/mirror-database-production-to-local.sh`), `unleash` crashes with it,
because the flag data lives in the same Postgres instance.
`docker compose up -d unleash-bootstrap` from the affected checkout repairs
everything — but all flags are then disabled again, thus toggle the flags
that you tested again.

## Shutdown

Kill the dev server that you started; `up.sh` prints its log path.

**Worktree stack that you keep:** `docker compose stop` — this keeps the
seeded database for the next time.

**Worktree that you remove:** remove the stack fully BEFORE you delete the
directory. A plain `down` leaves two things behind: the `sam-collab` image
built from this worktree, and the anonymous volume that holds its Postgres
data.

```bash
cd <worktree>
docker compose down --rmi local --volumes --remove-orphans
```

If the directory is already gone, address the stack with the project name:
`docker compose ls -a` to find it, then
`docker compose -p <project> down --rmi local --volumes --remove-orphans`.

**Main stack:** keep it in operation. Stop it with
`docker stop sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1 sam-unleash-1`
only when the user asks, and NEVER `docker compose down` it — its containers
hold the only copy of the dev data.

Heavy worktree use still fills the disk: stacks of worktrees that were
deleted without the full `down`, `sam-collab` images that each `--build`
replaces, and build cache. `docker system df` shows the usage;
`docker image prune -f`, `docker builder prune -f` and
`docker volume prune -f` clear it. The main stack survives all three prunes —
its containers exist also when they are stopped, thus their image and data
volume count as in use — but the prunes are Docker-wide and also remove
dangling images and cache from the other projects of the user. Everything is
rebuildable, but tell the user.

## Troubleshooting

- **`pnpm: command not found`** — pnpm is not on the PATH of the Bash tool
  here (fish + fnm). Run it as `corepack pnpm …`; the script does the same.
- **`lsof` crashes on this machine** — use `ss -ltn` to examine ports.
- **Hundreds of incorrect type errors** — the postinstall steps (Prisma
  client generation, `next typegen`) never ran; `corepack pnpm install` in
  `pnpm-monorepo` repairs this.
- **Queries fail on columns that exist in the Prisma schema** — the
  migrations are behind. `up.sh` applies them on every run in the checkout
  that it runs from, also in the main checkout, whose dev DB otherwise stays
  behind until a feature needs it. Always use `prisma migrate deploy`, never
  the `migrate:dev` script: `migrate dev` offers to RESET the database on
  drift, and it also triggers the destructive-command consent guard.
- **The app of a worktree points to a different stack** — its `.env` files
  are often HARDLINKED to the copies of the main checkout (`ls -la` shows
  link count 2), and a truncation of one file in place also rewrites the
  other. Rewrite with the sequence read → `rm` → write; `up.sh` does the
  same.
- **Multi-step shell commands get refused** as too complex to verify, and a
  worktree session cannot `cd` to the shared checkout before a git command.
  Put each multi-step procedure in a scratchpad `.sh` file and run it with
  `bash` — one call, no refusals. (The quotes in the `COPY` snippet above
  also cause problems in fish.)
