import type { Locator, Page } from "@playwright/test";
import {
  createAppEvent,
  createCitizen,
  createOnSiteNotification,
  createUserWithoutCitizen,
  futureEvent,
  ONE_DAY_MS,
} from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { appDummyEnvironment } from "../setup/stack";

const EXPIRY_NOTE_TEXT = "Die Anmeldung für die Statistiken läuft ab.";

const ONE_HOUR_IN_SECONDS = 60 * 60;

const GRAFANA_ORIGIN = new URL(appDummyEnvironment.STATISTICS_GRAFANA_URL)
  .origin;

interface TokenClaims {
  readonly sub: string;
  readonly aud: string;
  readonly iat: number;
  readonly exp: number;
  readonly jti: string;
}

/**
 * Reads the frame URL and the claims of its token. The stack has no
 * Grafana, thus the test only decodes the token, and the unit tests of the
 * app verify the signature. The assertions compare single values, so that
 * a failure never prints the token.
 */
const readFrame = async (frame: Locator) => {
  const url = new URL((await frame.getAttribute("src")) ?? "");
  const [, encodedClaims = ""] = (
    url.searchParams.get("auth_token") ?? ""
  ).split(".");

  return {
    url,
    claims: JSON.parse(
      Buffer.from(encodedClaims, "base64url").toString("utf8"),
    ) as TokenClaims,
  };
};

/** The stack has no Grafana, thus each request fails, but it still counts. */
const countFrameRequests = (page: Page) => {
  let count = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).origin === GRAFANA_ORIGIN) count += 1;
  });

  return () => count;
};

const appsPopover = (page: Page) =>
  page.getByRole("dialog", { name: "Apps", exact: true });

const openAppsPopover = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Apps" }),
    appsPopover(page).getByText("Featured", { exact: true }),
  );

const notificationCenterInbox = (page: Page) =>
  page
    .getByRole("dialog", { name: "Benachrichtigungen" })
    .getByRole("tab", { name: "Inbox" });

test("the statistics page shows the dashboard and signs a new token after the expiry", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "statistiker",
    permissionStrings: ["globalStatistics;read"],
  });
  await signIn(viewer.user);

  await page.clock.install();
  const frameRequestCount = countFrameRequests(page);
  await page.goto("/app/statistics");

  const frame = page.locator("#main-content iframe");
  await expect(frame).toHaveAttribute("title", "Statistiken");

  const first = await readFrame(frame);
  expect(first.url.origin).toBe(GRAFANA_ORIGIN);
  expect(first.url.pathname).toBe("/d/sam-statistics/statistiken");
  expect(first.url.searchParams.get("kiosk")).toBe("1");
  expect(first.claims.aud).toBe("sam-statistics-grafana");
  expect(first.claims.sub).toBe(viewer.entity.id);
  expect(first.claims.exp - first.claims.iat).toBe(ONE_HOUR_IN_SECONDS);

  /** The timer of the note starts at the hydration */
  await waitForAppShellHydration(page);
  await expect.poll(frameRequestCount).toBe(1);
  const expiryNote = page.getByText(EXPIRY_NOTE_TEXT);
  await expect(expiryNote).toHaveCount(0);

  await page.clock.fastForward("01:00:00");

  await expect(expiryNote).toBeVisible();
  await expect(frame).toHaveAttribute("inert");

  await page.getByRole("button", { name: "Statistiken neu laden" }).click();

  await expect(expiryNote).toHaveCount(0);
  await expect(frame).not.toHaveAttribute("inert");

  const second = await readFrame(frame);
  expect(second.claims.jti).not.toBe(first.claims.jti);
  expect(second.claims.exp - second.claims.iat).toBe(ONE_HOUR_IN_SECONDS);

  /**
   * A sleeping tab: the time goes on, but the timer does not fire. The page
   * finds the expiry when the tab becomes visible again.
   */
  await page.clock.setSystemTime(
    (await page.evaluate(() => Date.now())) + ONE_HOUR_IN_SECONDS * 1000,
  );
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(expiryNote).toBeVisible();

  expect(frameRequestCount()).toBe(2);
});

test("the frame of the statistics page keeps its token when a different action renders the page again", async ({
  page,
  prisma,
  signIn,
}) => {
  const author = await createCitizen(prisma, {
    handle: "statistik-autor",
    permissionStrings: ["event;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "statistik-leser",
    permissionStrings: ["globalStatistics;read", "event;read"],
    emailVerified: new Date(Date.now() - ONE_DAY_MS),
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Zählwerk",
    createdById: author.entity.id,
    ...futureEvent(),
  });
  /**
   * The notification announces an event that is new for the viewer. When
   * the viewer marks all notifications as read, the event is read too, and
   * the action renders the page again on the server.
   */
  await createOnSiteNotification(prisma, {
    citizenId: viewer.entity.id,
    notificationType: "event_created",
    payload: { eventId: event.id, eventName: event.name },
  });
  await signIn(viewer.user);

  await page.clock.install();
  await page.goto("/app/statistics");

  const frame = page.locator("#main-content iframe");
  const first = await readFrame(frame);

  /** The dot of the events app goes away only with a new render */
  const eventsAppDot = appsPopover(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: "Events", exact: true }) })
    .first()
    .locator("[data-unread-dot]");
  /** With an unread notification, it opens itself after the hydration */
  await expect(notificationCenterInbox(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await openAppsPopover(page);
  await expect(eventsAppDot).toBeVisible();
  await page.keyboard.press("Escape");

  await clickUntilVisible(
    page.getByRole("button", { name: "Benachrichtigungen" }),
    notificationCenterInbox(page),
  );
  await page
    .getByRole("dialog", { name: "Benachrichtigungen" })
    .getByRole("button", { name: "Alle als gelesen markieren", exact: true })
    .click();
  await expect
    .poll(() =>
      prisma.readMarker.count({
        where: { eventId: event.id, citizenId: viewer.entity.id },
      }),
    )
    .toBe(1);
  await page.keyboard.press("Escape");

  await openAppsPopover(page);
  await expect(eventsAppDot).toHaveCount(0);
  await page.keyboard.press("Escape");
  expect((await readFrame(frame)).claims.jti).toBe(first.claims.jti);

  /**
   * The button takes the token of its own render, not the token of the
   * render before: the test holds the render of the button, and the frame
   * waits for it.
   */
  await page.clock.fastForward("01:00:00");
  const expiryNote = page.getByText(EXPIRY_NOTE_TEXT);
  await expect(expiryNote).toBeVisible();

  let releaseRefresh = () => {};
  const refreshReleased = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await page.route(
    (url) => url.pathname === "/app/statistics",
    async (route) => {
      const headers = route.request().headers();
      if (headers.rsc === "1" && !headers["next-router-prefetch"])
        await refreshReleased;
      await route.continue();
    },
  );

  await page.getByRole("button", { name: "Statistiken neu laden" }).click();
  await expect(page.getByRole("button", { name: "Lädt …" })).toBeDisabled();
  expect((await readFrame(frame)).claims.jti).toBe(first.claims.jti);

  releaseRefresh();
  await expect(expiryNote).toHaveCount(0);
  expect((await readFrame(frame)).claims.jti).not.toBe(first.claims.jti);
});

test("the statistics page shows the expiry note at once when a back navigation shows an old token again", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "statistik-zurueck",
    permissionStrings: ["globalStatistics;read"],
  });
  await signIn(viewer.user);

  await page.clock.install();
  await page.goto("/app/statistics");

  const frame = page.locator("#main-content iframe");
  const first = await readFrame(frame);
  await waitForAppShellHydration(page);

  await page.clock.fastForward("30:00");
  await openAppsPopover(page);
  await clickUntilUrl(
    page,
    appsPopover(page).getByRole("link", { name: "Dashboard", exact: true }),
    /\/app\/dashboard$/,
  );

  /** Next.js shows the page from its cache, with the token of the first render */
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/statistics$/);
  expect((await readFrame(frame)).claims.jti).toBe(first.claims.jti);

  const expiryNote = page.getByText(EXPIRY_NOTE_TEXT);
  await expect(expiryNote).toHaveCount(0);

  await page.clock.fastForward("30:00");
  await expect(expiryNote).toBeVisible();
});

test("the statistics page shows a note instead of the dashboard to a user without a citizen", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
}) => {
  const user = await createUserWithoutCitizen(prisma, {
    name: "statistik-admin",
    admin: true,
  });
  await signIn(user);
  await enableAdminMode();

  await page.goto("/app/statistics");

  await expect(
    page
      .locator("#main-content")
      .getByText(
        "Die Statistiken benötigen einen Citizen, der mit deinem Account verknüpft ist.",
      ),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
});
