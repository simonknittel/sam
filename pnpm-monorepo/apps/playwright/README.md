# Playwright tests

End-to-end tests against a self-contained stack — no live system is
involved. Each run starts its own infrastructure, thus tests can seed the
database for each test case.

## Architecture

- **Global setup** (`setup/global-setup.ts`): starts one Postgres container
  (through testcontainers) and applies the Prisma migrations to a template
  database. It also starts one RustFS (S3) container, one Unleash (feature
  flags) container and one Soketi (realtime) container, builds the collab
  image from `apps/collab/Dockerfile` and the relay image from
  `apps/relay/Dockerfile`, and runs `next build` for the app. The values of
  `appDummyEnvironment` and `soketiEnvironment` (`setup/stack.ts`) win over
  the developer `.env`, for example the pinned `NEXT_PUBLIC_BASE_URL` and
  the Soketi settings, which the build inlines. Thus Soketi has a fixed host
  port for each checkout (`soketiHostPort`).
- **Per worker** (`fixtures/test.ts`): each Playwright worker clones its own
  database from the template. It also starts its own collab container, its
  own relay container (the relay service of the Remote Control Program), its
  own Discord mock, its own server for the client documents of the MCP test
  client (`fixtures/cimd-server.ts`) and its own `next start` instance.
  Tests of different workers can never interfere with each other — except
  through the shared Unleash server, the shared Soketi app and the shared
  RustFS container with its `uploads` bucket. The channels of Soketi contain
  the random ids of the rows of the worker database, thus a worker never
  gets the events of a different worker. For the flags, the rule is: tests
  may only toggle flags (through `fixtures/unleash.ts`) that no other test
  depends on, or toggle a flag only for their own user or for the app of
  their worker (the scopes of `setUnleashFlag()`). The relay container of a
  worker has the Unleash app name of the app of the worker, thus the scope
  of the worker also changes the flags of its relay service.
- **Per test**: an automatic fixture truncates all tables and resets the
  Discord mock. Thus each test starts from an empty database and seeds
  exactly what it needs through the factories in `fixtures/factories.ts`.
- **Auth**: `signIn(user)` inserts a next-auth database session and sets the
  session cookie — no OAuth flow is involved. Users come from
  `createCitizen()`, which creates the User, the Discord account, the
  Citizen, the role and the permissions in the form that the session
  callback expects. The MCP tests connect a client with the real OAuth flow
  (`authorizeMcpClient()` and `connectMcpClient()`, see `fixtures/oauth.ts` and
  `fixtures/mcp-client.ts`).
  Their users come from `createMcpCitizen()`, which adds the permission
  `mcp;use` that the MCP server requires.
  Their assertions never print a token: compare the status and the error of
  a token response, not the response.

## Run the tests

```bash
pnpm test                          # full suite (builds app, collab and relay images)
PLAYWRIGHT_SKIP_BUILD=1 pnpm test  # reuse the previous app build and images
pnpm exec playwright test tests/wiki-editing.spec.ts   # single file
```

`PLAYWRIGHT_SKIP_BUILD=1` also reuses an old build after a change to the app
or after a branch switch. Then the tests do not test your change.

Requirements: Docker runs and is logged in to `dhi.io` (see the
[requirements of the local machine](../../../docs/setup-local-machine.md#requirements)),
and the Playwright browsers are installed
(`pnpm exec playwright install chromium`).

The suite is fully independent of the dev stack (`compose.yml`) — both can
run at the same time. To see the logs of the containers (for example of
the relay service), set `DEBUG=testcontainers:containers`.

## Write a test

Use the helpers in `fixtures/`, first of all `interactions.ts`. They repeat
an action until the page reacts, because a fill or a click before hydration
can have no effect.

- Add each permission check as a row in `tests/gated-routes.spec.ts`, not as
  a new spec.
- Assert the page content, then the URL. The pages send 404, 403 and
  redirects with HTTP status 200. Only the proxy and the route handlers send
  the real status.
- Assert the saved values immediately after the save, before
  `page.reload()`. A reload can hide a form error.
- Make sure that a filter test can fail: also seed rows of a different type
  and of a different user.
- `page.goto()` always loads the page again from the server. Thus it cannot
  test `refresh()` or the client router cache.
- Some components refresh the page by themselves: `MarkAsReadOnMount` on the
  first visit of a new item, the read-on-view of new changelog entries, the
  read of a notification about a new item, `trackWikiPageVisit` when the page
  is gone, and the collab editor when its token request gives a 401, 403 or
  404 or a changed edit right. A test that changes the target right after a
  load can pass because of this refresh. Wait for these actions (for example
  the visit row or the editor), or seed the read marker.
- While a page streams, React keeps a hidden copy of the content next to the
  visible copy. A strict locator then finds two elements ("strict mode
  violation"). Scope the locator of a text that streams in (for example an
  empty state or a note) to `#main-content`, or add
  `.filter({ visible: true })`.
- The app shell is on each page, and its mobile drawer is in the DOM also on
  a desktop viewport. `getByLabel()` and `getByText()` find substrings and
  ignore the case, thus a loose locator can find an element of the shell. Use
  the full text or `exact: true`. After a change to the shell, run the full
  suite.
- After a change of a filter or of the sort order, wait for the new rows
  before you click a pagination control. Until the new render arrives, the
  control holds the cursor of the old render.
- Escape in a Base UI combobox whose list is closed clears the selection.
  After `pickFilterOption()`, press Escape only while the list is open.
- The suite sets `reducedMotion: "reduce"`. A test of an animation must call
  `page.emulateMedia({ reducedMotion: "no-preference" })`.
- The browser runtime of the Remote Control Program reads a log folder in
  the origin private file system of the browser (`stubDirectoryPicker()` in
  `fixtures/log-analyzer.ts`). It reads the folder each 10 seconds, thus a
  new line needs `LIVE_UPLOAD_TIMEOUT` or `page.clock.fastForward()`. The
  tabs of one citizen in one browser share one runtime. Each citizen has its
  own runtime, folder and settings in the browser, but a browser context has
  only one session. Thus two citizens whose runtimes run at the same time
  need a second browser (`openSignedInBrowser()`). Use the helpers of
  `fixtures/remote-control-program.ts` for the sharing popover and for the
  uploaded lines in the database. The name of the trigger of the popover is
  also a part of the name of the permission "Remote Control Program nutzen".
- A test that turns off a part of the Remote Control Program uses the scope
  of the stack, because the relay service reads the flag without a user. The
  test turns the part on again in a `finally` block, because the next tests
  of the worker use the same relay service.
- The stack runs no Lambda functions and sends no EventBridge events. Test
  the delivery of notifications with unit tests.

## Examine a flaky test

- Run the test with `--repeat-each=3` or more. The first test of a new
  worker most frequently loses a fill before hydration.
- Do not trust a full run while the dev stack or a Docker build also runs,
  or while `pnpm install` runs in the same checkout.
- Some tests fail from time to time. Run them again, and do not search for
  the cause in your change:
  - The keyboard tests of `wiki-block-menu.spec.ts`: ProseMirror reads a
    selection change too slowly in the collab editor.
  - The "replace mode" test of `wiki-copy-paste.spec.ts`: cause unknown.
  - The pagination test of `activity.spec.ts`: only in full runs.
  - `notification-center.spec.ts`: `ERR_NETWORK_CHANGED`.
  - The popover tests of `citizen-profile.spec.ts`: after a new build.
  - Under load, a dialog or the bell popover of `waitForAppShellHydration()`
    does not open in the reaction timeout (seen in
    `seasonal-theme-settings.spec.ts`, `spynet-organizations.spec.ts`,
    `wiki-permissions.spec.ts`, `discord-publishing.spec.ts`,
    `event-lineup.spec.ts` and `event-applications.spec.ts`).
- To reproduce a hydration problem, make the CPU slower in a temporary spec:

  ```ts
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send("Emulation.setCPUThrottlingRate", { rate: 20 });
  ```
