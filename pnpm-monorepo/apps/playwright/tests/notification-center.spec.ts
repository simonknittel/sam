import type { Page } from "@playwright/test";
import { createCitizen, createOnSiteNotification } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

const bellButton = (page: Page) =>
  page.getByRole("button", { name: "Benachrichtigungen" });

/**
 * The notification center is mounted twice (top bar popover and the hidden
 * mobile flyout), so desktop assertions are scoped to the open popover —
 * Base UI renders its popup with `role="dialog"`, named after its trigger.
 */
const popover = (page: Page) =>
  page.getByRole("dialog", { name: "Benachrichtigungen" });

const openNotificationCenter = async (page: Page) => {
  await bellButton(page).click();
  await expect(
    popover(page).getByRole("tab", { name: "Posteingang" }),
  ).toBeVisible();
};

/**
 * exact — "Ungelesen" would otherwise also match the read rows'
 * "Als ungelesen markieren" buttons by substring.
 */
const unreadRowDots = (page: Page) =>
  popover(page).getByTitle("Ungelesen", { exact: true });

/** Dwell time + flush debounce + server action, with headroom. */
const READ_ON_VIEW_TIMEOUT = 15_000;

test("unread notifications drive the bell dot and the tab title", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "notified" });
  await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
  await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
  await signIn(citizen.user);

  await page.goto("/app");

  // Often the worker's first page load — warm-up can exceed the default 5s
  await expect(page).toHaveTitle(/^\(2\)/, { timeout: 15_000 });
  await expect(bellButton(page).locator(".bg-amber-500").first()).toBeVisible();
});

test("without unread notifications there is no dot and no title count", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "caught-up" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    readAt: new Date(),
  });
  await signIn(citizen.user);

  await page.goto("/app");

  await expect(page).toHaveTitle(/^[^(]/);
  await expect(bellButton(page).locator(".bg-amber-500")).toHaveCount(0);
});

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
  await expect(page).toHaveTitle(/^\(2\)/);
  await openNotificationCenter(page);
  await expect(unreadRowDots(page)).toHaveCount(2);

  await expect(page).toHaveTitle(/^[^(]/, { timeout: READ_ON_VIEW_TIMEOUT });
  await expect(bellButton(page).locator(".bg-amber-500")).toHaveCount(0);
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
  const now = Date.now();
  for (let index = 1; index <= 30; index++) {
    await createOnSiteNotification(prisma, {
      citizenId: citizen.entity.id,
      payload: { eventId: `evt-${index}`, eventName: `Event ${index}` },
      createdAt: new Date(now - index * 1_000),
    });
  }
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

test("archiving removes the notification and clears the count", async ({
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
  await expect(page).toHaveTitle(/^\(1\)/);
  await openNotificationCenter(page);

  await popover(page).getByText("Neues Event").hover();
  await popover(page)
    .getByRole("button", { name: "Archivieren", exact: true })
    .click();

  await expect(
    popover(page).getByText("Keine Benachrichtigungen", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/^[^(]/);

  await popover(page).getByRole("tab", { name: "Archiv", exact: true }).click();
  await expect(popover(page).getByText("Neues Event")).toBeVisible();
  await expect(
    popover(page).getByRole("button", { name: "Wiederherstellen" }),
  ).toBeAttached();

  await expect
    .poll(async () => {
      const row = await prisma.onSiteNotification.findUnique({
        where: { id: notification.id },
      });
      return row?.archivedAt;
    })
    .not.toBeNull();
});

test("an archived notification can be restored", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "restorer" });
  const notification = await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    readAt: new Date(),
    archivedAt: new Date(),
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await popover(page).getByRole("tab", { name: "Archiv", exact: true }).click();
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

test("all notifications can be marked read at once", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "bulk-reader" });
  for (let index = 0; index < 3; index++) {
    await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
  }
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await popover(page)
    .getByRole("button", { name: "Alle als gelesen markieren", exact: true })
    .click();

  await expect(unreadRowDots(page)).toHaveCount(0);
  await expect(page).toHaveTitle(/^[^(]/);

  await expect
    .poll(() => prisma.onSiteNotification.count({ where: { readAt: null } }))
    .toBe(0);
});

test("read notifications can be archived at once", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "bulk-archiver" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    payload: { eventId: "evt-unread", eventName: "Ungelesenes Event" },
  });
  for (let index = 0; index < 2; index++) {
    await createOnSiteNotification(prisma, {
      citizenId: citizen.entity.id,
      payload: { eventId: `evt-read-${index}`, eventName: `Gelesen ${index}` },
      readAt: new Date(),
    });
  }
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await popover(page)
    .getByRole("button", { name: "Gelesene archivieren", exact: true })
    .click();

  await expect(popover(page).getByText("Ungelesenes Event")).toBeVisible();
  await expect(popover(page).getByText("Gelesen 0")).not.toBeAttached();

  await popover(page).getByRole("tab", { name: "Archiv", exact: true }).click();
  await expect(popover(page).getByText("Gelesen 0")).toBeVisible();
  await expect(popover(page).getByText("Gelesen 1")).toBeVisible();
});

test("long lists page with Mehr laden", async ({ page, prisma, signIn }) => {
  const citizen = await createCitizen(prisma, { handle: "pager" });
  const now = Date.now();
  for (let index = 1; index <= 30; index++) {
    await createOnSiteNotification(prisma, {
      citizenId: citizen.entity.id,
      payload: { eventId: `evt-${index}`, eventName: `Event ${index}` },
      createdAt: new Date(now - index * 1_000),
      readAt: new Date(),
    });
  }
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

test("the settings link leads to the notification settings", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "configurer" });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await popover(page).getByRole("link", { name: "Einstellungen" }).click();

  await expect(page).toHaveURL("/app/account/notifications");
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the notification center is available in the mobile flyout", async ({
    page,
    prisma,
    signIn,
  }) => {
    const citizen = await createCitizen(prisma, { handle: "mobile-user" });
    await createOnSiteNotification(prisma, { citizenId: citizen.entity.id });
    await signIn(citizen.user);

    await page.goto("/app");
    await expect(page).toHaveTitle(/^\(1\)/);

    await page.locator("nav").getByRole("button", { name: "Apps" }).click();
    await openNotificationCenter(page);

    await expect(popover(page).getByText("Neues Event")).toBeVisible();

    await expect(page).toHaveTitle(/^[^(]/, { timeout: READ_ON_VIEW_TIMEOUT });
    await expect
      .poll(() => prisma.onSiteNotification.count({ where: { readAt: null } }))
      .toBe(0);

    // Read in the database, but still highlighted while the popover stays open
    await expect(unreadRowDots(page)).toHaveCount(1);
  });
});
