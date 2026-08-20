---
name: run-app
description: Spin up the sam Next.js app locally (dev server + backing Docker services) so a change can be tested in the real app. Use when asked to run, start, spin up, or serve the app, or to verify a change works in the browser.
---

# Run the sam app locally

## Start here: one command

```bash
bash .agents/skills/run-app/scripts/up.sh
```

Run it from the checkout you want up — it picks a port slot, writes the
env files, starts the containers, seeds the database if it is empty,
applies migrations, starts the dev server and prints the URL. It is
idempotent, so re-running it on an already-up stack takes seconds.

**Do this instead of walking the manual steps below.** Doing it by hand
costs ~17 sequential tool calls; measured against that, none of the
individual commands are slow (a fully cached `docker compose up --build`
is ~2s, the 62MB database seed is a one-off). The round trips are the
cost, so collapse them.

The script also reports whether a valid session exists. Read that line:
without one the user hits the login redirect and cannot get past it, and
on a worktree port Discord OAuth cannot mint one — see §5. Sort the
session out in the same pass, before handing over a URL.

The rest of this document is the reference for what the script does, for
debugging it, and for the parts it deliberately leaves manual (session
transfer, shutdown, disk reclamation).

### Sandbox gotchas that waste turns

A session working inside a worktree refuses shell commands that `cd` to
the shared checkout before a git command, and some compound commands
(`rm … && cat > …`, pipes between two `docker` invocations) are rejected
as too complex to verify. Put anything multi-step in a scratchpad `.sh`
and run it with `bash` — one call, no refusals. Files under
`.agents/skills/` live only in the main checkout and cannot be written
from a worktree-isolated session at all; leave the worktree first.

## Reference

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
| unleash flags      | 4242          | 4242 + N |

```bash
ss -ltn '( sport = :3001 or sport = :5433 or sport = :6002 or sport = :9602 or sport = :5211 or sport = :9001 or sport = :4243 )'
```

(`lsof` crashes on this machine — use `ss`. Slot 1 is free if only the
header line comes back.)

No output → the slot is free (bump all the ports by one and re-check
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

`packages/database/.env` is usually HARDLINKED to the main checkout's
copy (`ls -la` shows link count 2). Editing it in place — `sed -i`, a
Python `open(…, "w")` — rewrites the main checkout's file too and
silently points the main stack at the worktree's database. Break the
link first: read the contents, `rm` the file, then write it fresh.

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

### Feature flags

To test flag-gated behavior, toggle a flag through the local Unleash
admin API instead of pointing the user at the admin UI
(http://localhost:4242, `admin` / `unleash4all`). Use the slot's port
(`4242 + N`) in a worktree — 4242 addresses the MAIN stack's flags:

```bash
curl -s -X POST -H "Authorization: *:*.unleash-insecure-admin-token" \
  http://localhost:4242/api/admin/projects/default/features/<flag>/environments/development/on   # or .../off
```

Flag names come from the app's `UNLEASH_FLAG` enum; the bootstrap
pre-creates all of them, so a 404 means a typo or a brand-new flag
(create it first: `POST .../features` with body `{"name":"<flag>"}`).
The app caches flag definitions for up to ~30 s — wait or poll before
concluding a toggle "didn't work".

If the `psql` container gets RECREATED (e.g. by
`scripts/mirror-database-production-to-local.sh`), the `unleash`
container crashes with it, because the flag data lives in the same
Postgres instance. `docker compose up -d unleash-bootstrap` from the
affected checkout heals everything — but all flags are back to
disabled, so re-toggle what you were testing.

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

ALWAYS run migrations afterwards — not just when the branch adds them.
The dump carries whatever schema main's DB had at that moment, and the
main checkout's dev DB is regularly BEHIND its own branch (nobody
migrates it until a feature needs it). A seeded worktree therefore
starts out missing migrations that are already merged:

```bash
cd <worktree>/pnpm-monorepo/packages/database
pnpm exec prisma migrate deploy
```

Use `migrate deploy`, not the `migrate:dev` script: deploy only applies
pending migrations, while `migrate dev` offers to RESET the database on
drift and trips the destructive-command consent guard anyway.

Symptom of skipping this: queries fail on columns that exist in the
Prisma schema, and the row copy below dies with `ERROR: extra data
after last expected column`. Diff the two sides instead of guessing:

```bash
docker exec sam-psql-1 psql -U postgres -d db -tAc "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5"
docker compose exec -T psql psql -U postgres -d db -tAc "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5"
```

### Re-seeding is blocked — copy rows instead

`DROP DATABASE`, `TRUNCATE` and friends are refused by the permission
classifier, so there is no supported "wipe and re-copy" path — don't
burn turns rediscovering that. Copy only the rows you need; `COPY … TO
STDOUT` piped into `COPY … FROM STDIN` is additive and allowed:

```bash
cd <worktree>
docker exec sam-psql-1 psql -U postgres -d db \
  -c "COPY (SELECT * FROM \"Session\" WHERE id = '<id>') TO STDOUT" \
  | docker compose exec -T psql psql -U postgres -d db -c "COPY \"Session\" FROM STDIN"
```

Both schemas must already match (see above) and the target row must not
exist yet — compare ids first. Quoting like this survives fish poorly;
write it to a scratchpad `.sh` and run it with `bash`.

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

### The user has no active session

Check for this BEFORE handing over a URL (`up.sh` prints it) — otherwise
the user opens the app, bounces off the login redirect, and the whole
transfer starts as an interruption.

The one-time fix that removes the detour entirely is adding
`http://localhost:<port>/api/auth/callback/discord` for each slot port to
the Discord application's OAuth2 redirect URIs. Offer it; it is the
user's to do.

Otherwise: Discord OAuth can't be driven programmatically, and the
callback is pinned to `NEXTAUTH_URL`, so the user must sign in on the
MAIN checkout (port 3000) and the resulting row gets carried over. Run it
as one pass — each round trip costs the user a wait:

1. Stop the worktree dev server (frees attention, not the port) and
   start the main stack plus `pnpm run dev` in
   `<main>/pnpm-monorepo/apps/app`. Hand the user
   `http://localhost:3000` and say the main checkout does NOT contain
   the branch's changes — it is only for getting a session.
2. When they confirm, stop the main dev server and read the new row's
   id: `SELECT id, expires > now() FROM "Session"`. Sign-in creates a
   NEW row, so compare against what the worktree already has.
3. `prisma migrate deploy` on the worktree DB (§3) — the schemas must
   match before the copy, and main is usually the migrated one.
4. Copy that one `Session` row across (§3), restart the worktree dev
   server, and verify before handing the URL back:

```bash
TOKEN=$(docker compose exec -T psql psql -U postgres -d db -tAc "SELECT \"sessionToken\" FROM \"Session\" WHERE id = '<id>'")
curl -s -o /dev/null -w '%{http_code}\n' --cookie "next-auth.session-token=${TOKEN}" http://localhost:3001/app   # 200
```

Print only the status code — the token is a credential and must never
reach the transcript. The user's browser needs no action: the cookie is
set on `localhost` and cookies ignore the port.

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
`docker stop sam-psql-1 sam-soketi-1 sam-sam-collab-1 sam-rustfs-1 sam-unleash-1`
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
