import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  FORBIDDEN_TEXT,
} from "../fixtures/interactions";
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
  "/app/iam/permission-matrix",
  "/app/iam/roles",
  "/app/iam/users",
  "/app/leaderboards",
  "/app/penalty-points",
  "/app/silc/dashboard",
  "/app/silc/settings",
  "/app/silc/transactions",
  "/app/sincome",
  "/app/spynet/activity",
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
const OPEN_ROUTES: readonly [
  route: string,
  marker: (page: Page) => Locator,
][] = [
  ["/app/dashboard", (page) => page.getByRole("heading", { name: "Spynet" })],
  ["/app/apps", (page) => page.getByRole("link", { name: "Changelog" })],
  [
    "/app/uploads",
    (page) => page.getByText("Du hast bisher keine Dateien hochgeladen."),
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
    await expect(forbidden, `${route} must be forbidden`).toBeVisible({
      // The first navigation warms the worker's app up
      timeout: ACTION_FEEDBACK_TIMEOUT,
    });
  }

  for (const [route, marker] of OPEN_ROUTES) {
    await page.goto(route);
    await expect(marker(page), `${route} must stay open`).toBeVisible({
      timeout: ACTION_FEEDBACK_TIMEOUT,
    });
    await expect(forbidden, `${route} must stay open`).toHaveCount(0);
  }
});

/**
 * The spynet settings are the one gate that sends visitors to the landing
 * page instead of rendering the forbidden boundary.
 */
test("the spynet settings send an unauthorized citizen to the landing page", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "ohne-spynet-rechte" });
  await signIn(citizen.user);

  await page.goto("/app/spynet/settings");

  await expect(page).toHaveURL("/", { timeout: ACTION_FEEDBACK_TIMEOUT });
});

test("an unknown route answers with 404", async ({ request }) => {
  const response = await request.get("/does-not-exist");

  expect(response.status()).toBe(404);
});
