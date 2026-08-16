# Playwright tests

End-to-end tests against a self-contained stack — no live system involved.
Every run spawns its own infrastructure, so tests can freely seed the
database per test case.

## Architecture

- **Global setup** (`setup/global-setup.ts`): starts one Postgres container
  (via testcontainers), applies the Prisma migrations to a template
  database, starts one RustFS (S3) and one Unleash (feature flags)
  container, builds the collab image from `apps/collab/Dockerfile` and runs
  `next build` for the app.
- **Per worker** (`fixtures/test.ts`): each Playwright worker clones its own
  database from the template, starts its own collab container and its own
  `next start` instance. Tests of different workers can never interfere with
  each other — except through the shared Unleash server: tests may only
  toggle flags (via `fixtures/unleash.ts`) no other test depends on.
- **Per test**: an automatic fixture truncates all tables, so every test
  starts from an empty database and seeds exactly what it needs via the
  factories in `fixtures/factories.ts`.
- **Auth**: `signIn(user)` inserts a next-auth database session and sets the
  session cookie — no OAuth flow involved. Users come from
  `createCitizen()`, which wires up User, Discord account, Entity, role and
  permissions the way the session callback expects them.

## Running

```bash
pnpm test                          # full suite (builds app + collab image)
PLAYWRIGHT_SKIP_BUILD=1 pnpm test  # reuse the previous app build and collab image
pnpm exec playwright test tests/wiki-editing.spec.ts   # single file
```

Requirements: Docker running, Playwright browsers installed
(`pnpm exec playwright install chromium`).

The suite is fully independent of the dev stack (`compose.yml`) — both can
run at the same time.
