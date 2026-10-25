import type { Page } from "@playwright/test";
import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/client";
import {
  createAppEvent,
  createCitizen,
  createOnSiteNotification,
  createOnSiteNotifications,
  futureEvent,
} from "../fixtures/factories";
import { clickUntilVisible, sectionByHeading } from "../fixtures/interactions";
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

/** The row of a notification, found through a text of its body */
const notificationRow = (page: Page, text: string) =>
  popover(page).getByRole("listitem").filter({ hasText: text });

/** The "Erste Schritte" popover, which the welcome greeting opens */
const onboardingPopover = (page: Page) =>
  page.getByRole("dialog", { name: "Erste Schritte" });

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

test("a birthday greeting reads its wording", async ({
  page,
  prisma,
  signIn,
}) => {
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
});

test("a New Year greeting reads its wording", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "neujahrskind" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "new_year",
    payload: {
      title: "Willkommen in 2957!",
      body: "Ein neues Jahr, ein neues Verse. Auf viele gemeinsame Flüge.",
    },
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  await expect(popover(page).getByText("Willkommen in 2957!")).toBeVisible();
  await expect(
    popover(page).getByText(
      "Ein neues Jahr, ein neues Verse. Auf viele gemeinsame Flüge.",
    ),
  ).toBeVisible();
});

test("a welcome greeting reads its wording and opens the onboarding popover", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "neuankoemmling" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "welcome",
    payload: {
      title: "Willkommen an Bord!",
      body: "Schön, dass du da bist. Deine ersten Schritte warten auf dich.",
    },
  });
  await signIn(citizen.user);

  /** Not the dashboard, thus the link must navigate to it */
  await page.goto("/app/apps");
  await openNotificationCenter(page);

  await expect(
    popover(page).getByText(
      "Schön, dass du da bist. Deine ersten Schritte warten auf dich.",
    ),
  ).toBeVisible();
  await popover(page)
    .getByRole("link", { name: "Willkommen an Bord!" })
    .click();

  await expect(
    onboardingPopover(page).getByText("Lerne das SAM kennen"),
  ).toBeVisible();
  await expect(page).toHaveURL("/app/dashboard");
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

test("opening the popover marks nothing as read, the toggle marks one notification", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "viewer" });
  const alpha = await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    payload: { eventId: "evt-alpha", eventName: "Operation Alpha" },
  });
  const beta = await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    payload: { eventId: "evt-beta", eventName: "Operation Beta" },
  });
  await signIn(citizen.user);

  await page.goto("/app");
  // The unread count drives the bell dot and the tab title
  await expect(page).toHaveTitle(/^\(2\)/);
  await expect(bellDot(page)).toBeVisible();

  await openNotificationCenter(page);
  await expect(unreadRowDots(page)).toHaveCount(2);

  const alphaRow = notificationRow(page, "Operation Alpha");
  await alphaRow.hover();
  await alphaRow
    .getByRole("button", { name: "Als gelesen markieren", exact: true })
    .click();

  await expect(unreadRowDots(page)).toHaveCount(1);
  await expect(page).toHaveTitle(/^\(1\)/);
  await expect(
    alphaRow.getByRole("button", {
      name: "Als ungelesen markieren",
      exact: true,
    }),
  ).toBeAttached();
  await expect
    .poll(async () =>
      (
        await prisma.onSiteNotification.findMany({
          where: { id: { in: [alpha.id, beta.id] } },
          orderBy: { createdAt: "asc" },
        })
      ).map((notification) => notification.readAt !== null),
    )
    .toEqual([true, false]);
});

test("reading the notification about a new task marks the task as read", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "nc-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "nc-leser",
    permissionStrings: ["task;read"],
  });
  const task = await prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      createdById: creator.entity.id,
      // Later than the email confirmation of the viewer, thus the task is new
      createdAt: new Date(),
    },
  });
  await createOnSiteNotification(prisma, {
    citizenId: viewer.entity.id,
    notificationType: "task_created",
    payload: { taskId: task.id, taskTitle: task.title },
  });
  await signIn(viewer.user);

  await page.goto("/app/dashboard");
  await expect(sectionByHeading(page, "Neue Tasks")).toBeVisible();
  await openNotificationCenter(page);

  const taskRow = notificationRow(page, "Frachter eskortieren");
  await taskRow.hover();
  await taskRow
    .getByRole("button", { name: "Als gelesen markieren", exact: true })
    .click();

  await expect
    .poll(() =>
      prisma.readMarker.count({
        where: { taskId: task.id, citizenId: viewer.entity.id },
      }),
    )
    .toBe(1);
  // The refresh removes the tile, which shows only new tasks
  await expect(sectionByHeading(page, "Neue Tasks")).toHaveCount(0);
  await expect(page).toHaveTitle(/^[^(]/);
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

test("the bulk actions mark everything read with the announced events and archive what is read", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "bulk-reader",
    permissionStrings: ["event;read"],
  });
  const creator = await createCitizen(prisma, { handle: "bulk-creator" });
  const event = await createAppEvent(prisma, {
    name: "Operation Sammelmarke",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "event_created",
    payload: { eventId: event.id, eventName: event.name },
  });
  await createOnSiteNotifications(prisma, {
    citizenId: citizen.entity.id,
    count: 2,
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await expect(page).toHaveTitle(/^\(3\)/);
  await openNotificationCenter(page);

  await popover(page)
    .getByRole("button", { name: "Alle als gelesen markieren", exact: true })
    .click();

  await expect(unreadRowDots(page)).toHaveCount(0);
  await expect(page).toHaveTitle(/^[^(]/);
  await expect
    .poll(() => prisma.onSiteNotification.count({ where: { readAt: null } }))
    .toBe(0);
  await expect
    .poll(() =>
      prisma.readMarker.count({
        where: { eventId: event.id, citizenId: citizen.entity.id },
      }),
    )
    .toBe(1);

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

test("a notification about a new event leads to the event and marks it as read", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "durchklicker",
    permissionStrings: ["event;read"],
  });
  const creator = await createCitizen(prisma, { handle: "zielsprung-chef" });
  const event = await createAppEvent(prisma, {
    name: "Operation Zielsprung",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  const notification = await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "event_created",
    payload: { eventId: event.id, eventName: event.name },
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openNotificationCenter(page);

  /**
   * The event is new, thus the read refreshes the page during the
   * navigation. The navigation must win.
   */
  await popover(page).getByRole("link", { name: "Neues Event" }).click();

  await expect(page).toHaveURL(`/app/events/${event.id}`);
  await expect(
    page.getByRole("heading", { name: "Operation Zielsprung" }).first(),
  ).toBeVisible();
  /** Following a notification closes the popover it came from */
  await expect(popover(page)).toHaveCount(0);
  await expect
    .poll(async () => ({
      notificationRead:
        (
          await prisma.onSiteNotification.findUniqueOrThrow({
            where: { id: notification.id },
          })
        ).readAt !== null,
      markers: await prisma.readMarker.count({
        where: { eventId: event.id, citizenId: citizen.entity.id },
      }),
    }))
    .toEqual({ notificationRead: true, markers: 1 });
  await expect(page).toHaveURL(`/app/events/${event.id}`);
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
    await expect(page).toHaveTitle(/^\(1\)/);

    await page.locator("nav").getByRole("button", { name: "Apps" }).click();
    await openNotificationCenter(page);

    await expect(popover(page).getByText("Neues Event")).toBeVisible();
    await expect(unreadRowDots(page)).toHaveCount(1);
  });
});
