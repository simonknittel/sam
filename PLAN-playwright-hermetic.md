# Hermetic Playwright test stack + wiki tests

## Goal

Replace the live-production Playwright smoke tests with a self-contained test
stack: each test run spawns its own Postgres and collab containers plus app
instances, so the database can be seeded per test case. On top of the new
architecture, add a first batch of end-to-end tests for the wiki.

## Decision log

- The app under test runs as a production build: one `next build`, one
  `next start` process per Playwright worker (dev-server mode rejected:
  dev-only noise, less representative).
- Containers are managed programmatically with the `testcontainers` npm
  library (pinned `12.0.4`; `12.1.0` is younger than 7 days).
- The live-system smoke tests are deleted entirely: the 3x/day schedule, the
  call from the Release workflow, the `BASE_URL`/bypass-header plumbing and
  the GitHub `Production` environment binding of the workflow.
- The hermetic suite runs on every pull request and push to `main`.
- Isolation model: one stack per Playwright worker — a per-worker database
  (cloned from a migrated template database on a single shared Postgres
  container), a per-worker collab container, a per-worker `next start`.
- Seeding happens through Prisma factories: the playwright package depends on
  `@sam-monorepo/database` and seeds typed fixtures directly.
- Wiki test scope (first batch): rendering + navigation,
  permissions/visibility, editing via collab, and search/tags/featured.
- Tiny app change approved: an optional server-side `COLLAB_URL` env var
  overrides the build-inlined `NEXT_PUBLIC_COLLAB_URL` at runtime. Required
  because `NEXT_PUBLIC_*` values are inlined at build time (also in server
  code), but per-worker collab ports must vary under one shared build.
- soketi/pusher is omitted from the test stack; the app self-disables pusher
  when the `NEXT_PUBLIC_PUSHER_*` vars are unset.

### Out of scope

- Image/attachment upload tests (would need an S3-compatible container such
  as MinIO; can be added later).
- Pusher/soketi-dependent behavior (live push updates).
- Algolia-backed search surfaces (wiki search itself is database-based and is
  covered).
- Feature tests outside the wiki beyond basic smoke checks.
- CI sharding/parallelization across runners.

## Overall implementation notes

- **Global setup** (runs once): start one Postgres container; create a
  template database and run the Prisma migrations against it; build the
  collab image from `apps/collab/Dockerfile` with a fixed tag; run
  `next build` for the app (S3/Algolia env left as empty strings — they pass
  validation and the features degrade). Connection details (Postgres port,
  network name, image tag) are written to a state file for the workers.
  Global teardown stops the containers; the testcontainers reaper cleans up
  after crashes.
- **Worker fixtures** (worker-scoped): clone a worker database from the
  template (`CREATE DATABASE … TEMPLATE …`, near-instant); start a collab
  container from the prebuilt image wired to that database (shared docker
  network with the Postgres container); spawn `next start` on a free port
  with runtime-only env (worker `DATABASE_URL`, `COLLAB_URL` pointing at the
  worker's collab port, `COLLAB_JWT_SECRET`, auth secrets). Test-scoped
  fixtures provide the per-worker `baseURL`, a Prisma client bound to the
  worker database, seed factories, `signInAs`, and a truncate-based database
  reset between tests.
- **Auth fixture**: next-auth v4 database sessions. The session callback
  requires an `Account` row (non-null assertion!) and resolves the Entity via
  `Account.providerAccountId === Entity.discordId`; permissions come from
  `RoleAssignment → Role → PermissionString` (plus role inheritance). So a
  test user = User + Account + Entity + role assignment(s) + Session row;
  `signInAs` sets the `next-auth.session-token` cookie in the browser
  context.
- **Wiki content seeding**: `WikiPage.content` (Tiptap JSON) and `searchText`
  can be seeded directly for static rendering/search tests. Editor tests go
  through the real collab flow (empty ydoc → type → persisted), or seed
  content via the collab `/replace` endpoint where a starting document is
  needed.
- **Known caveats**: all `next start` processes share one `.next` directory —
  fine for the cookie-authenticated (dynamic) app routes, but tests should
  use unique per-test data rather than relying on cross-instance cache
  behavior. Wiki page URLs must include the page id
  (`/app/wiki/<pageId>/<slug>`). German UI texts are asserted.

## Implementation phases

### Phase 1: Runtime collab URL override in the app

Allow the collab URL to differ per app instance at runtime despite the shared
build.

#### Status

Done — `COLLAB_URL` override in env.ts, shared `getWikiCollabUrl()` util used by the page routes, the editor section and `replaceWikiPageContent`; app typecheck green.

#### Steps

- Add an optional server-side `COLLAB_URL` env var to the app's env schema.
- Prefer it over `NEXT_PUBLIC_COLLAB_URL` where the server resolves the
  collab URL for the client.

#### Notes

- Deployments keep working unchanged; the new var is optional.

#### Verification

- App builds and type-checks; existing dev setup (without the new var) still
  resolves the collab URL.

### Phase 2: Test stack orchestration

The heart of the change: global setup/teardown, worker fixtures, factories
and auth helpers in the playwright package.

#### Status

Done — global setup (Postgres + template DB + migrations + parallel app/collab builds), worker fixtures with per-worker DB/collab/app, factories, signIn, auto reset. Smoke run green (3 tests, 2 workers, 1.1m).

#### Steps

- Add workspace dependency on the database package plus `testcontainers`;
  wire Prisma client generation into the playwright package's install.
- Implement global setup/teardown as described in the overall notes.
- Implement worker fixtures (worker database, collab container, app process)
  and test fixtures (baseURL, Prisma client, reset, factories, `signInAs`).
- Implement a small factory module for users (User + Account + Entity +
  roles + permissions), wiki pages (content, hierarchy, visibility,
  role access), tags and settings.

#### Notes

- Local runs can skip the app build with `PLAYWRIGHT_SKIP_BUILD=1` after an
  unchanged prior run (build reuse); CI always builds. The collab image build
  is skipped when an image with the content-derived tag already exists.
- The state file lives in the playwright package's gitignored `.stack/`
  directory.
- Postgres reachability from the collab container uses a dedicated docker
  network; the app process on the host uses mapped ports.
- `resetDatabase` truncates all public tables except `_prisma_migrations`
  (single statement, CASCADE) and runs in a test-scoped auto fixture.

#### Verification

- A trivial spec (homepage 200 + h1) passes against the spawned stack with 2
  workers; containers and processes are gone after the run.

### Phase 3: Wiki rendering + navigation tests

Seeded pages render via the static renderer and the sidebar/tree navigation
works.

#### Status

Done — title/content rendering, slug redirect, streamed 404 UI, sidebar tree navigation, landing "Zuletzt aktualisiert".

#### Steps

- Seed a small page tree with headings/paragraph content; assert page
  content, sidebar tree entries, navigation between pages, 404 for an
  unknown page id.
- Cover the wiki landing page (featured cards come in phase 6; here: the
  basic page list/dashboard surfaces render).

#### Notes

- The editor mounts when collab is configured; the static content serves as
  the pre-hydration fallback. Rendering assertions target the visible
  content, not implementation details.
- Hidden pages (sidebar modes) get a smoke-level assertion here; permission
  gating is phase 4.

#### Verification

- Specs pass locally with 2 workers and survive a repeated run (seeding is
  reset-safe).

### Phase 4: Wiki permission tests

Visibility/editability tiers behave as designed for different users.

#### Status

Done — RESTRICTED read for role members vs 404 + no sidebar leak for outsiders, INHERIT bounded by parent, top-level INHERIT only for `wiki;manage`, edit-toggle gating.

#### Steps

- Factories for users with distinct roles (wiki read, page-specific
  RESTRICTED role lists, `wiki;manage` admin).
- Assert: PUBLIC vs RESTRICTED page access as different users, INHERIT
  bounded by the parent, denied pages are not reachable nor listed
  (sidebar/search), edit-mode toggle only for users with edit permission.

#### Notes

- The admin surfaces additionally require the dev/admin enabler cookie
  (`enable_admin=1`) for users with admin permission.

#### Verification

- Specs pass; a permission-denied user sees neither content nor navigation
  leaks.

### Phase 5: Wiki collab editing tests

Real editing round-trip through the per-worker collab container.

#### Status

Done — collab typing round-trip (UI + persisted searchText + reload) and slash palette block insertion.

#### Steps

- Enter edit mode on a seeded page, type a paragraph, leave edit mode/reload,
  assert the content persisted (collab writes back to the worker database).
- Cover the slash palette opening and inserting a simple block.

#### Notes

- Editor gotchas from previous sessions apply (hover-corridor click
  redirection, caret placement, palette prefix rules); selectors follow the
  established recipes (DOM range for caret, `[data-suggestion-index]`
  scoping).

#### Verification

- Specs pass repeatedly (no flake across 3 consecutive runs locally).

### Phase 6: Wiki search, tags and featured pages tests

The database-based wiki search, tag surfaces and featured-page curation.

#### Status

Done — search by content, permission-filtered search ("Keine Treffer."), tag chip + tag listing page, featured cards filtered by read access.

#### Steps

- Search: seed pages with distinctive `searchText`/titles; assert hits and
  permission filtering.
- Tags: seed tags + assignments; assert tag display on the page and the tag
  overview/filter surface.
- Featured: seed the featured-pages setting; assert the landing page card
  grid.

#### Status

Not started.

#### Verification

- Specs pass; search never returns pages the user cannot read.

### Phase 7: CI rewrite and removal of the live smoke setup

The workflow becomes a PR/push gate running the hermetic suite.

#### Status

Done — workflow rewritten (PR/push, no job container, browser install, report upload), schedule/release-call/env plumbing removed. CI run itself still pending (happens after merge/push).

#### Steps

- Rewrite the Playwright workflow: triggers `pull_request` + `push` to
  `main`; no job container (testcontainers needs the runner's docker; the
  Playwright browsers are installed via the CLI instead); install, build,
  run with 2 workers; keep the HTML report upload.
- Remove the schedule, the `workflow_call` usage from the Release workflow,
  the `Production` environment binding and the `BASE_URL`/custom-header env.
- Delete the old live-smoke spec and its env plumbing from the playwright
  package.

#### Notes

- The pnpm audit guard step stays.
- `.nvmrc`-pinned Node, pnpm version and caching mirror `validate-app.yml`.

#### Verification

- Workflow YAML passes actionlint (or at least `gh workflow` syntax
  acceptance); a PR run of the workflow is green.

## Final end-to-end verification

- [x] Full suite green locally from a clean state (no running dev containers
      required, no leftovers afterwards): 19/19 with the full build path
      (`pnpm --filter @sam-monorepo/playwright test`).
- [x] Second and third consecutive runs green (reset/idempotency, incl.
      `PLAYWRIGHT_SKIP_BUILD=1` fast path, ~15s).
- [x] `tsc --noEmit` green for the app and the playwright package.
- [ ] The app still runs normally in the regular dev setup (collab URL
      unchanged without the new env var) — code-reviewed only, not
      manually re-tested.

## Rollout plan

- [ ] Merge to `main` (fast-forward from the worktree branch)
- [ ] First CI run on `main` push is green
- [ ] Delete the now-unused GitHub bits: the `BASE_URL` +
      `PLAYWRIGHT_CUSTOM_HEADER_NAME` variables and the
      `PLAYWRIGHT_CUSTOM_HEADER_VALUE` secret in the `Production`
      environment (manual, Simon)
- [ ] Optionally remove the corresponding bypass-header rule on the hosting
      side (manual, Simon)
