import type { Page } from "@playwright/test";
import {
  createAppEvent,
  createCitizen,
  createOnSiteNotification,
  createOnSiteNotifications,
  futureEvent,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const bellButton = (page: Page) =>
  page.getByRole("button", { name: "Benachrichtigungen" });

/** The unread indicator of the bell, independent of the classes drawing it */
const bellDot = (page: Page) => bellButton(page).locator("[data-unread-dot]");

/**
 * The notification center is mounted twice (top bar popover and the hidden
 * mobile flyout), so desktop assertions are scoped to the open popover —
 * Base UI renders its popup with `role="dialog"`, named after its trigger.
 */
const popover = (page: Page) =>
  page.getByRole("dialog", { name: "Benachrichtigungen" });

const openNotificationCenter = (page: Page) =>
  clickUntilVisible(
    bellButton(page),
    popover(page).getByRole("tab", { name: "Posteingang" }),
  );

/**
 * exact — "Ungelesen" would otherwise also match the read rows'
 * "Als ungelesen markieren" buttons by substring.
 */
const unreadRowDots = (page: Page) =>
  popover(page).getByTitle("Ungelesen", { exact: true });

/** Dwell time + flush debounce + server action, with headroom. */
const READ_ON_VIEW_TIMEOUT = 15_000;

test("the popover lists notifications with their content", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "event_created",
    payload: { eventId: "evt-1", eventName: "Operation Pitchfork" },
  });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "task_assignment_updated",
    payload: { taskId: "task-1", taskTitle: "Schiff betanken" },
    readAt: new Date(),
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await expect(unreadRowDots(page)).toHaveCount(1);

  await expect(popover(page).getByText("Neues Event")).toBeVisible();
  await expect(popover(page).getByText("Operation Pitchfork")).toBeVisible();
  await expect(
    popover(page).getByText("Events", { exact: true }),
  ).toBeVisible();

  await expect(popover(page).getByText("Neuer Task")).toBeVisible();
  await expect(
    popover(page).getByText("Dir wurde ein Task zugewiesen: Schiff betanken"),
  ).toBeVisible();
});

/** The elements the birthday row is decorated with, whatever styles them */
const confettiCanvas = (page: Page) =>
  popover(page).locator("[data-confetti-canvas]");
const staticConfetti = (page: Page) =>
  popover(page).locator("[data-birthday-confetti-static]");

test("a birthday greeting reads its wording and sprinkles confetti", async ({
  page,
  prisma,
  signIn,
}) => {
  /** The whole suite runs with reduced motion, see playwright.config.ts */
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const citizen = await createCitizen(prisma, { handle: "geburtstagskind" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "birthday",
    payload: {
      title: "Ein Hoch auf dich!",
      body: "Zum Geburtstag wünschen wir dir nur das Beste und immer volle Tanks.",
    },
  });
  /** A greeting from before the greeting picked a wording at random */
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "birthday",
    payload: {},
  });
  /** Every other notification stays undecorated */
  await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await expect(popover(page).getByText("Ein Hoch auf dich!")).toBeVisible();
  await expect(
    popover(page).getByText(
      "Zum Geburtstag wünschen wir dir nur das Beste und immer volle Tanks.",
    ),
  ).toBeVisible();

  await expect(
    popover(page).getByText("Alles Gute zum Geburtstag!"),
  ).toBeVisible();
  await expect(
    popover(page).getByText("Wir wünschen dir einen schönen Tag."),
  ).toBeVisible();

  await expect(confettiCanvas(page)).toHaveCount(2);
  await expect(staticConfetti(page)).toHaveCount(0);
});

test("a birthday greeting stays still for a viewer who asks for it", async ({
  page,
  prisma,
  signIn,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const citizen = await createCitizen(prisma, {
    handle: "ruhiges-geburtstagskind",
  });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "birthday",
    payload: {},
  });
  await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await expect(staticConfetti(page)).toHaveCount(1);
  await expect(confettiCanvas(page)).toHaveCount(0);
});

test("unknown notification types render a generic fallback", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "fallback" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "mystery_type",
    payload: {},
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await expect(
    popover(page).getByText("Benachrichtigung", { exact: true }),
  ).toBeVisible();
});

test("notifications in view are marked read, keeping their highlight until the popover closes", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "viewer" });
  await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
  await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
  await signIn(citizen.user);

  await page.goto("/app");
  // The unread count drives the bell dot and the tab title
  await expect(page).toHaveTitle(/^\(2\)/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(bellDot(page)).toBeVisible();

  await openNotificationCenter(page);
  await expect(unreadRowDots(page)).toHaveCount(2);

  await expect(page).toHaveTitle(/^[^(]/, { timeout: READ_ON_VIEW_TIMEOUT });
  await expect(bellDot(page)).toHaveCount(0);
  await expect
    .poll(() => prisma.onSiteNotification.count({ where: { readAt: null } }))
    .toBe(0);

  // Read in the database, but still highlighted while the popover stays open
  await expect(unreadRowDots(page)).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(popover(page)).toHaveCount(0);
  await openNotificationCenter(page);

  await expect(unreadRowDots(page)).toHaveCount(0);
});

test("only notifications in view get marked read", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "scroller" });
  await createOnSiteNotifications(prisma, {
    citizenId: citizen.entity.id,
    count: 30,
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);
  await expect(
    popover(page).getByText("Event 1", { exact: true }),
  ).toBeVisible();

  await expect
    .poll(
      () =>
        prisma.onSiteNotification.count({ where: { readAt: { not: null } } }),
      { timeout: READ_ON_VIEW_TIMEOUT },
    )
    .toBeGreaterThan(0);

  const unreadCount = await prisma.onSiteNotification.count({
    where: { readAt: null },
  });
  expect(unreadCount).toBeGreaterThan(0);
});

test("a read notification can be marked unread again", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "rereader" });
  const notification = await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    readAt: new Date(),
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await popover(page).getByText("Neues Event").hover();
  await popover(page)
    .getByRole("button", { name: "Als ungelesen markieren", exact: true })
    .click();

  await expect(unreadRowDots(page)).toHaveCount(1);
  await expect(page).toHaveTitle(/^\(1\)/);

  await expect
    .poll(async () => {
      const row = await prisma.onSiteNotification.findUnique({
        where: { id: notification.id },
      });
      return row?.readAt;
    })
    .toBeNull();
});

test("a notification can be archived and restored again", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "archiver" });
  const notification = await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await expect(page).toHaveTitle(/^\(1\)/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await openNotificationCenter(page);

  await popover(page).getByText("Neues Event").hover();
  await popover(page)
    .getByRole("button", { name: "Archivieren", exact: true })
    .click();

  await expect(
    popover(page).getByText("Keine Benachrichtigungen", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/^[^(]/);
  await expect
    .poll(async () => {
      const row = await prisma.onSiteNotification.findUnique({
        where: { id: notification.id },
      });
      return row?.archivedAt;
    })
    .not.toBeNull();

  // Restoring it in the archive puts it back into the inbox
  await popover(page).getByRole("tab", { name: "Archiv", exact: true }).click();
  await expect(popover(page).getByText("Neues Event")).toBeVisible();
  await popover(page).getByText("Neues Event").hover();
  await popover(page)
    .getByRole("button", { name: "Wiederherstellen", exact: true })
    .click();

  await expect(
    popover(page).getByText("Keine archivierten Benachrichtigungen"),
  ).toBeVisible();

  await popover(page)
    .getByRole("tab", { name: "Posteingang", exact: true })
    .click();
  await expect(popover(page).getByText("Neues Event")).toBeVisible();

  await expect
    .poll(async () => {
      const row = await prisma.onSiteNotification.findUnique({
        where: { id: notification.id },
      });
      return row?.archivedAt;
    })
    .toBeNull();
});

test("the bulk actions mark everything read and archive what is read", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "bulk-reader" });
  /**
   * More rows than the popover shows at once: read-on-view would otherwise
   * mark the whole list read on its own, and the bulk button — which
   * disables itself once nothing is unread — could never be clicked.
   */
  await createOnSiteNotifications(prisma, {
    citizenId: citizen.entity.id,
    count: 30,
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await popover(page)
    .getByRole("button", { name: "Alle als gelesen markieren", exact: true })
    .click();

  await expect(unreadRowDots(page)).toHaveCount(0);
  await expect(page).toHaveTitle(/^[^(]/, { timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect
    .poll(() => prisma.onSiteNotification.count({ where: { readAt: null } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toBe(0);

  // Everything is read by now, so archiving the read ones empties the inbox
  await popover(page)
    .getByRole("button", { name: "Gelesene archivieren", exact: true })
    .click();

  await expect(
    popover(page).getByText("Keine Benachrichtigungen", { exact: true }),
  ).toBeVisible();

  await popover(page).getByRole("tab", { name: "Archiv", exact: true }).click();
  await expect(
    popover(page).getByText("Event 1", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      prisma.onSiteNotification.count({ where: { archivedAt: null } }),
    )
    .toBe(0);
});

test("long lists page with Mehr laden", async ({ page, prisma, signIn }) => {
  const citizen = await createCitizen(prisma, { handle: "pager" });
  await createOnSiteNotifications(prisma, {
    citizenId: citizen.entity.id,
    count: 30,
    readAt: new Date(),
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await expect(
    popover(page).getByText("Event 1", { exact: true }),
  ).toBeVisible();
  await expect(
    popover(page).getByText("Event 25", { exact: true }),
  ).toBeAttached();
  await expect(
    popover(page).getByText("Event 26", { exact: true }),
  ).not.toBeAttached();

  await popover(page).getByRole("button", { name: "Mehr laden" }).click();

  await expect(
    popover(page).getByText("Event 30", { exact: true }),
  ).toBeAttached();
  await expect(
    popover(page).getByRole("button", { name: "Mehr laden" }),
  ).not.toBeAttached();
});

test("a notification leads to the entity it is about", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "durchklicker",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Zielsprung",
    createdById: citizen.entity.id,
    ...futureEvent(),
  });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "event_created",
    payload: { eventId: event.id, eventName: event.name },
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await popover(page).getByRole("link", { name: "Neues Event" }).click();

  await expect(page).toHaveURL(`/app/events/${event.id}`, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    page.getByRole("heading", { name: "Operation Zielsprung" }).first(),
  ).toBeVisible();
  /** Following a notification closes the popover it came from */
  await expect(popover(page)).toHaveCount(0);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the mobile flyout mounts the notification center", async ({
    page,
    prisma,
    signIn,
  }) => {
    const citizen = await createCitizen(prisma, { handle: "mobile-user" });
    await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
    await signIn(citizen.user);

    await page.goto("/app");
    await expect(page).toHaveTitle(/^\(1\)/, {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    });

    await page.locator("nav").getByRole("button", { name: "Apps" }).click();
    await openNotificationCenter(page);

    await expect(popover(page).getByText("Neues Event")).toBeVisible();
    await expect(unreadRowDots(page)).toHaveCount(1);
  });
});
