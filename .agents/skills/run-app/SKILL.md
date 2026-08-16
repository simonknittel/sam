---
name: run-app
description: Spin up the sam Next.js app locally (dev server + backing Docker services) so a change can be tested in the real app. Use when asked to run, start, spin up, or serve the app, or to verify a change works in the browser.
---

# Run the sam app locally

The app is a Next.js app at `pnpm-monorepo/apps/app` (package
`@sam-monorepo/app`). Dev server: `pnpm run dev`, port 3000.

Multiple git worktrees can run at the same time: each checkout runs its
OWN compose stack and dev server on its own ports. Docker Compose
derives the project name from the checkout directory, so the container
sets never collide — only host ports must differ. The main checkout
(first entry of `git worktree list`, project `sam`, containers
`sam-psql-1` etc.) uses the default ports; every worktree picks a port
slot. Always run `docker compose` from the root of the checkout you are
working in — the directory determines which stack you address.

## Port slots

The main checkout is slot 0 (all defaults). A worktree takes the lowest
slot N ≥ 1 whose ports are free:

| Service            | Slot 0 (main) | Slot N   |
| ------------------ | ------------- | -------- |
| Next.js dev server | 3000          | 3000 + N |
| Postgres           | 5432          | 5432 + N |
| soketi websockets  | 6001          | 6001 + N |
| soketi metrics     | 9601          | 9601 + N |
| collab (wiki)      | 5210          | 5210 + N |
| rustfs S3          | 9000          | 9000 + N |

```bash
lsof -nP -iTCP:3001,5433,6002,9602,5211,9001 -sTCP:LISTEN   # slot 1 free if no output
```

No output → the slot is free (bump all five ports by one and re-check
for slot 2, and so on). Ports of a stopped-but-existing worktree stack
don't show up here — prefer reusing that stack (`docker compose start`)
over claiming its slot for a different worktree.

## 1. Install (fresh checkout/worktree only)

```bash
cd <checkout>/pnpm-monorepo
pnpm install
```

The postinstall steps (Prisma client generation in `packages/database`,
`next typegen` in the app) are required — without them the app and
`tsc` fail with hundreds of bogus errors. Takes ~45s.

Two gitignored `.env` files are required; worktrees created by the
harness usually get them copied automatically. If missing, copy both
from the main checkout:

- `pnpm-monorepo/apps/app/.env`
- `pnpm-monorepo/packages/database/.env` (read by Prisma CLI commands)

In a worktree, adjust them to the slot's ports (slot 1 shown):

- `DATABASE_URL` → port `5433` (in BOTH files)
- `NEXTAUTH_URL` → `http://localhost:3001`
- `COLLAB_URL` → `ws://localhost:5211`
- `S3_ENDPOINT` → `http://localhost:9001` and
  `S3_PUBLIC_URL` → `http://localhost:9001/uploads`
- `UNLEASH_SERVER_API_URL` → `http://localhost:4243/api`
- append `NEXT_PUBLIC_PUSHER_CHANNELS_PORT="6002"` (not present in the
  main `.env`; the app defaults to 6001)

## 2. Backing services (Docker)

`compose.yml` at the repo root defines `psql` (Postgres), `soketi`
(websockets), `sam-collab` (wiki realtime backend), `rustfs`
(S3-compatible upload storage; the bucket incl. anonymous-read policy
and CORS rules is created by the one-shot `rustfs-bootstrap` service)
and `unleash` (feature flags; the app's flags are created disabled by
the one-shot `unleash-bootstrap` service).
Host ports interpolate `SAM_*_PORT` variables from a gitignored `.env`
next to `compose.yml` — absent variables fall back to the slot-0
defaults.

**Main checkout** — no root `.env`; just start the existing containers:

```bash
docker start sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1 sam-unleash-1
docker exec sam-psql-1 pg_isready -U postgres   # wait for "accepting connections"
```

**Worktree** — write the slot's ports to `<worktree>/.env` (slot 1
shown), then bring up the stack:

```bash
cat > <worktree>/.env <<'EOF'
SAM_PSQL_PORT=5433
SAM_SOKETI_PORT=6002
SAM_SOKETI_METRICS_PORT=9602
SAM_COLLAB_PORT=5211
SAM_RUSTFS_PORT=9001
SAM_UNLEASH_PORT=4243
EOF
cd <worktree>
docker compose up -d --build
docker compose exec psql pg_isready -U postgres   # wait for "accepting connections"
```

`--build` matters: it builds the `sam-collab` image from THIS
worktree's `pnpm-monorepo/apps/collab` instead of reusing an image
built from another branch's code. Each rebuild leaves the previous
image dangling and grows the build cache — §7 covers reclaiming that
space.

## 3. Seed the worktree database from the main stack

`compose.yml` declares no named volumes — each stack's data lives
inside its own `psql` container, and a fresh worktree stack starts with
an EMPTY database. Copy the main checkout's dev data (main Postgres
must be running):

```bash
docker start sam-psql-1
cd <worktree>
docker exec sam-psql-1 pg_dump -U postgres db | docker compose exec -T psql psql -q -U postgres db
```

If the worktree branch adds migrations, apply them afterwards:

```bash
cd <worktree>/pnpm-monorepo/packages/database
pnpm run migrate:dev
```

To re-seed later (fresh copy of the main data), drop and recreate the
database first, restart the collab server (it held connections to the
dropped database), then repeat the copy:

```bash
cd <worktree>
docker compose exec psql psql -U postgres -d postgres -c 'DROP DATABASE db WITH (FORCE)' -c 'CREATE DATABASE db'
docker compose restart sam-collab
```

## 4. Dev server

The dev server MUST run on the slot's port and `NEXTAUTH_URL` must
match it — auth callbacks are pinned to that origin, and Next silently
moving to the next free port breaks login. If the slot port is taken,
something is wrong (probably a leftover dev server) — fix that instead
of letting Next pick another port.

```bash
cd <checkout>/pnpm-monorepo/apps/app
PORT=3001 pnpm run dev   # worktree slot 1; main: plain `pnpm run dev` (3000)
# run in background; "✓ Ready in ~3s"
```

## 5. Smoke check

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/app/wiki  # 307 → /
```

The 307 to `/` is the unauthenticated redirect and is expected: login
is Discord OAuth, so authenticated pages can only be tested through the
user's browser session — hand them the URL instead of trying to log in
programmatically.

Login usually carries over from the main app: sessions are
database-backed (and were copied with the database) and localhost
cookies are shared across ports. If a FRESH Discord login on a worktree
port fails with a redirect_uri error, the Discord application needs
`http://localhost:<port>/api/auth/callback/discord` added to its OAuth2
redirect URIs — a one-time manual step for the user.

## 6. Shutdown

Kill the dev server you started.

**Worktree stack, keeping it around:** `docker compose stop` (keeps the
seeded database for next time).

**Worktree being removed:** tear the stack down fully, BEFORE deleting
the worktree directory:

```bash
cd <worktree>
docker compose down --rmi local --volumes --remove-orphans
```

A plain `down` removes only the containers and network, leaving two
things that pile up on disk: the `sam-collab` image built from this
worktree (`<project>-sam-collab`) and the anonymous volume the postgres
image creates for its data. The flags remove both. If the worktree
directory is already gone, address the stack by project name instead:
`docker compose ls -a` to find it, then
`docker compose -p <project> down --rmi local --volumes --remove-orphans`.

**Main stack:** leave it running; stop with
`docker stop sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1`
only when the user asks. NEVER `docker compose down` the main stack — its containers
hold the only copy of the dev data.

## 7. Reclaiming disk space

Heavy worktree use leaks disk in three places: stacks of worktrees that
were deleted without the full `down` above, superseded `sam-collab`
images left dangling by every `--build`, and Docker build cache. To
check and clean:

```bash
docker system df                  # what's using space
docker compose ls -a              # tear down stacks whose worktree no longer exists (§6)
docker image prune -f             # dangling images (old sam-collab builds)
docker builder prune -f           # build cache
docker volume prune -f            # anonymous volumes orphaned by earlier plain `down`s
```

The main stack survives all three prunes: its containers exist (even
when stopped), so their image and data volume count as in use. The
prunes are Docker-wide though — they also drop dangling images and
cache from the user's other projects (all rebuildable, but worth
mentioning to the user).
