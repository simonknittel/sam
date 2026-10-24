import type { Locator, Page } from "@playwright/test";
import { WikiPageVisibility } from "@sam-monorepo/database/client";
import {
  createAppEvent,
  createCitizen,
  createWikiPage,
  futureEvent,
} from "../fixtures/factories";
import { FORBIDDEN_TEXT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * Every route of /app that is closed to a citizen holding nothing but the
 * login permission, taken from the pages' own guards (`authorizePage` and
 * the hand-rolled `forbidden()` calls). One sign-in walks all of them, so
 * adding a gated route costs one row here instead of a spec of its own.
 *
 * Routes whose gate needs an id (an event, a template, a citizen) stay with
 * the spec that owns that entity — the gate there is about the entity, not
 * about the route.
 */
const GATED_ROUTES = [
  "/app/account/analytics",
  /** `mcp;use` */
  "/app/account/mcp",
  /** No readable flow and no `career;manage` */
  "/app/career",
  "/app/career/settings",
  "/app/events",
  /** Neither `event;create` nor `event;manage` nor a shared template */
  "/app/events/templates",
  "/app/fleet/changes",
  "/app/fleet/my-ships",
  "/app/fleet/org",
  "/app/fleet/settings/manufacturer",
  "/app/iam/inheritance-matrix",
  "/app/iam/permission-matrix",
  "/app/iam/roles",
  "/app/iam/settings",
  "/app/iam/users",
  "/app/leaderboards",
  /** `manualNotification;manage` */
  "/app/manual-notifications",
  "/app/penalty-points",
  "/app/silc/dashboard",
  "/app/silc/settings",
  "/app/silc/transactions",
  "/app/sincome",
  "/app/spynet/activity",
  "/app/spynet/birthdays",
  "/app/spynet/citizen",
  "/app/spynet/notes",
  "/app/spynet/other",
  "/app/statistics",
  "/app/system-log",
  "/app/tasks",
  "/app/tools/log-analyzer",
  "/app/wiki/reports",
  "/app/wiki/settings",
] as const;

/**
 * Routes that stay open to everyone, each with something only its rendered
 * page shows — so a gate accidentally added to one of them fails here
 * instead of silently locking people out. `/app/uploads` is among them on
 * purpose: everyone manages their own files, and `upload;manage` widens the
 * query instead of opening the route.
 */
const OPEN_ROUTES: readonly [route: string, marker: (page: Page) => Locator][] =
  [
    ["/app/dashboard", (page) => page.getByRole("heading", { name: "Spynet" })],
    ["/app/apps", (page) => page.getByRole("link", { name: "Changelog" })],
    /** Every citizen switches the seasonal events off for themselves */
    [
      "/app/account/appearance",
      (page) => page.getByRole("heading", { name: "Saisonale Events" }),
    ],
    [
      "/app/uploads",
      (page) => page.getByText("Du hast bisher keine Dateien hochgeladen."),
    ],
    /** The wiki only closes for a viewer without a citizen of their own */
    [
      "/app/wiki",
      (page) => page.getByRole("heading", { name: "Seiten durchsuchen" }),
    ],
  ];

test("permission-gated routes are closed to a citizen without permissions", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "ohne-rechte" });
  await signIn(citizen.user);

  const forbidden = page.getByText(FORBIDDEN_TEXT);

  for (const route of GATED_ROUTES) {
    await page.goto(route);
    await expect(forbidden, `${route} must be forbidden`).toBeVisible();
  }

  for (const [route, marker] of OPEN_ROUTES) {
    await page.goto(route);
    await expect(marker(page), `${route} must stay open`).toBeVisible();
    await expect(forbidden, `${route} must stay open`).toHaveCount(0);
  }
});

/**
 * The spynet settings are the one gate that redirects instead of rendering
 * the forbidden boundary: it sends visitors to the landing page, which then
 * bounces a signed-in one on to their dashboard.
 */
test("the spynet settings send an unauthorized citizen away", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "ohne-spynet-rechte" });
  await signIn(citizen.user);

  await page.goto("/app/spynet/settings");

  await expect(page).toHaveURL("/app/dashboard");
  await expect(page.getByText(FORBIDDEN_TEXT)).toHaveCount(0);
});

/**
 * Next.js renders the segments of a route separately and streams them in one
 * response, thus the redirect of the root layout of `/app` does not stop the
 * data of a nested layout or of `generateMetadata`. The test reads the raw
 * response, because the browser follows the redirect before it shows
 * anything.
 */
test("a user without clearance gets no data of a layout or of a page title", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const permissionStrings = ["event;read"];
  const cleared = await createCitizen(prisma, {
    handle: "mit-freigabe",
    permissionStrings,
  });
  const unconfirmed = await createCitizen(prisma, {
    handle: "unbestaetigt",
    permissionStrings,
  });
  await prisma.user.update({
    where: { id: unconfirmed.user.id },
    data: { emailVerified: null },
  });
  const withoutLogin = await createCitizen(prisma, {
    handle: "ohne-anmeldung",
    permissionStrings,
    canLogIn: false,
  });

  const wikiPage = await createWikiPage(prisma, {
    title: "Sichtbare Wiki-Seite",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await createWikiPage(prisma, {
    title: "Unterseite im Seitenbaum",
    parentId: wikiPage.id,
  });
  const event = await createAppEvent(prisma, {
    name: "Event mit Namen",
    createdById: cleared.entity.id,
    ...futureEvent(),
  });

  const readBodies = async () =>
    Promise.all(
      [`/app/wiki/${wikiPage.id}`, `/app/events/${event.id}`].map(
        async (path) => (await page.request.get(path)).text(),
      ),
    );
  const TITLES = [
    "Sichtbare Wiki-Seite",
    "Unterseite im Seitenbaum",
    "Event mit Namen",
  ];

  // The control: the bodies carry the titles for a user with clearance
  await signIn(cleared.user);
  const clearedBodies = (await readBodies()).join("\n");
  for (const title of TITLES) expect(clearedBodies).toContain(title);

  for (const citizen of [unconfirmed, withoutLogin]) {
    await switchUser(citizen.user);
    const bodies = (await readBodies()).join("\n");

    for (const title of TITLES)
      expect(
        bodies,
        `${citizen.entity.handle} must not get ${title}`,
      ).not.toContain(title);
  }
});

test("an unknown route answers with 404", async ({ request }) => {
  const response = await request.get("/does-not-exist");

  expect(response.status()).toBe(404);
});
