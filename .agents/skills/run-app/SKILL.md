---
name: run-app
description: Spin up the sam Next.js app locally (dev server + backing Docker services) so a change can be tested in the real app. Use when asked to run, start, spin up, or serve the app, or to verify a change works in the browser.
---

# Run the sam app locally

The app is a Next.js app at `pnpm-monorepo/apps/app` (package
`@sam-monorepo/app`). Dev server: `pnpm run dev`, port 3000.

## 1. Install (fresh checkout/worktree only)

```bash
cd <checkout>/pnpm-monorepo
pnpm install
```

The postinstall steps (Prisma client generation in `packages/database`,
`next typegen` in the app) are required — without them the app and
`tsc` fail with hundreds of bogus errors. Takes ~45s.

`apps/app/.env` is gitignored but required; worktrees created by the
harness get it copied automatically. If it is missing, copy it from the
main checkout at `<repo>/pnpm-monorepo/apps/app/.env`.

## 2. Backing services (Docker)

`compose.yml` at the repo root defines `psql` (Postgres, 5432), `soketi`
(websockets, 6001/9601) and `sam-collab` (wiki realtime backend, 5210).

**Reuse the existing containers of the `sam` compose project — do not
`docker compose up` from a worktree.** A worktree directory yields a
different compose project name, which creates fresh containers and an
EMPTY database; compose.yml declares no named volumes, so the dev data
lives inside the existing containers.

```bash
docker start sam-psql-1 sam-soketi-1
docker exec sam-psql-1 pg_isready -U postgres   # wait for "accepting connections"
```

Port 5210 (collab): the user often runs the Hocuspocus collab server
locally from `../../core-services` instead of the container. Check
first:

```bash
lsof -nP -iTCP:5210 -sTCP:LISTEN
```

- A local `node` process listens → leave it; the app uses it via
  `NEXT_PUBLIC_COLLAB_URL`. `docker start sam-sam-collab-1` would just
  fail with "address already in use".
- Nothing listens → `docker start sam-sam-collab-1`.

## 3. Dev server

Port 3000 must be free (`NEXTAUTH_URL` pins auth callbacks to
`localhost:3000`; Next silently moving to 3001 breaks login).

```bash
cd <checkout>/pnpm-monorepo/apps/app
pnpm run dev   # run in background; "✓ Ready in ~3s"
```

## 4. Smoke check

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/app/wiki  # 307 → /
```

The 307 to `/` is the unauthenticated redirect and is expected: login
is Discord OAuth, so authenticated pages can only be tested through the
user's browser session — hand them the URL instead of trying to log in
programmatically.

## 5. Shutdown

Kill the dev server, then `docker stop sam-psql-1 sam-soketi-1` (and
`sam-sam-collab-1` if you started it). Do not stop the user's local
collab server on 5210.
