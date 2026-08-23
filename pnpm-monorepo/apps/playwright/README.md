# Playwright tests

End-to-end tests against a self-contained stack — no live system is
involved. Each run starts its own infrastructure, thus tests can seed the
database for each test case.

## Architecture

- **Global setup** (`setup/global-setup.ts`): starts one Postgres container
  (through testcontainers) and applies the Prisma migrations to a template
  database. It also starts one RustFS (S3) container and one Unleash
  (feature flags) container, builds the collab image from
  `apps/collab/Dockerfile` and runs `next build` for the app.
- **Per worker** (`fixtures/test.ts`): each Playwright worker clones its own
  database from the template. It also starts its own collab container, its
  own Discord mock and its own `next start` instance. Tests of different
  workers can never interfere with each other — except through the shared
  Unleash server and the shared RustFS container with its `uploads` bucket.
  For the flags, the rule is: tests may only toggle flags (through
  `fixtures/unleash.ts`) that no other test depends on.
- **Per test**: an automatic fixture truncates all tables and resets the
  Discord mock. Thus each test starts from an empty database and seeds
  exactly what it needs through the factories in `fixtures/factories.ts`.
- **Auth**: `signIn(user)` inserts a next-auth database session and sets the
  session cookie — no OAuth flow is involved. Users come from
  `createCitizen()`, which creates the User, the Discord account, the
  Entity, the role and the permissions in the form that the session
  callback expects.

## Run the tests

```bash
pnpm test                          # full suite (builds app + collab image)
PLAYWRIGHT_SKIP_BUILD=1 pnpm test  # reuse the previous app build and collab image
pnpm exec playwright test tests/wiki-editing.spec.ts   # single file
```

Requirements: Docker runs, and the Playwright browsers are installed
(`pnpm exec playwright install chromium`).

The suite is fully independent of the dev stack (`compose.yml`) — both can
run at the same time.
