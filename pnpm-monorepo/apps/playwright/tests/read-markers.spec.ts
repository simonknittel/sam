import type { Locator, Page } from "@playwright/test";
import type { Prisma, PrismaClient } from "@sam-monorepo/database/client";
import {
  EventVisibility,
  TaskRewardType,
  TaskVisibility,
} from "@sam-monorepo/database/client";
import {
  createAppEvent,
  createCitizen,
  createRole,
  futureEvent,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  ONE_MINUTE_MS,
  type TestCitizen,
} from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** Before the start of the read markers, thus only that start is the cutoff */
const LONG_AGO = new Date("2020-01-01T00:00:00.000Z");

const createTask = (
  prisma: PrismaClient,
  creator: TestCitizen,
  title: string,
  data: Partial<Prisma.TaskUncheckedCreateInput> = {},
) =>
  prisma.task.create({
    data: {
      title,
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      createdById: creator.entity.id,
      /**
       * Set by the test instead of the database, thus it is later than the
       * email confirmation of the citizens created before
       */
      createdAt: new Date(),
      ...data,
    },
  });

/** The row of a task, found through the link on its title */
const taskRow = (scope: Page | Locator, page: Page, title: string) =>
  scope
    .locator("article")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });

/** The card of an event, found through its heading */
const eventCard = (scope: Page | Locator, page: Page, name: string) =>
  scope
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

/** The "Neu" badge, independent of the classes drawing it */
const newBadge = (scope: Locator) => scope.locator("[data-new-badge]");

const newMarkerButton = (scope: Locator) =>
  scope.getByRole("button", { name: "Neu – als gelesen markieren" });

const appsPopover = (page: Page) =>
  page.getByRole("dialog", { name: "Apps", exact: true });

const openAppsPopover = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Apps" }),
    appsPopover(page).getByText("Featured", { exact: true }),
  );

/**
 * The dot badge of an app in the Apps popover. Not the dot of the Apps
 * button: it also counts the unseen changelog entries.
 */
const appDot = (page: Page, appName: string) =>
  appsPopover(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: appName, exact: true }) })
    .first()
    .locator("[data-unread-dot]");

test("a new task stays new until the viewer opens it, also after a back navigation", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "rm-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "rm-leser",
    permissionStrings: ["task;read"],
  });
  const task = await createTask(prisma, creator, "Frachter eskortieren");

  await signIn(viewer.user);

  await page.goto("/app/tasks");
  await expect(
    newBadge(taskRow(page, page, "Frachter eskortieren")),
  ).toBeVisible();

  await page.goto("/app/dashboard");
  await openAppsPopover(page);
  await expect(appDot(page, "Tasks")).toBeVisible();
  await page.keyboard.press("Escape");

  const newTasksTile = sectionByHeading(page, "Neue Tasks");
  await clickUntilUrl(
    page,
    newTasksTile.getByRole("link", {
      name: "Frachter eskortieren",
      exact: true,
    }),
    new RegExp(`/app/tasks/${task.id}$`),
  );

  await expect
    .poll(() =>
      prisma.readMarker.count({
        where: {
          taskId: task.id,
          citizenId: viewer.entity.id,
        },
      }),
    )
    .toBe(1);

  // The client router cache must not bring back the old state
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  // Only the dashboard shows it, thus the task page is gone
  await expect(page.getByRole("heading", { name: "Spynet" })).toBeVisible();
  await expect(sectionByHeading(page, "Neue Tasks")).toHaveCount(0);
  await openAppsPopover(page);
  await expect(appDot(page, "Tasks")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.goto("/app/tasks");
  await expect(
    taskRow(page, page, "Frachter eskortieren").getByRole("link", {
      name: "Frachter eskortieren",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    newBadge(taskRow(page, page, "Frachter eskortieren")),
  ).toHaveCount(0);

  /**
   * A second visit writes neither a second marker nor a second audit event.
   * The page shows no change, thus the test waits for the response of the
   * server action which the page sends after it mounted.
   */
  const secondMarkAsRead = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === `/app/tasks/${task.id}`,
  );
  await page.goto(`/app/tasks/${task.id}`);
  await secondMarkAsRead;
  expect(await prisma.readMarker.count({ where: { taskId: task.id } })).toBe(1);
  expect(
    await prisma.auditEvent.count({ where: { type: "READ_MARKER_CREATED" } }),
  ).toBe(1);
});

test("the marker in the dashboard tile marks a task as read, and the next new task moves up", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "rm-kachel-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "rm-kachel-leser",
    permissionStrings: ["task;read"],
    emailVerified: new Date(Date.now() - ONE_DAY_MS),
  });

  // "Auftrag 6" is the newest, thus "Auftrag 1" does not fit into the tile
  for (let taskNumber = 1; taskNumber <= 5; taskNumber++)
    await createTask(prisma, creator, `Auftrag ${taskNumber}`, {
      createdAt: new Date(Date.now() - (7 - taskNumber) * ONE_MINUTE_MS),
    });
  const newestTask = await createTask(prisma, creator, "Auftrag 6", {
    createdAt: new Date(Date.now() - ONE_MINUTE_MS),
  });

  await signIn(viewer.user);
  await page.goto("/app/dashboard");
  await waitForAppShellHydration(page);

  const newTasksTile = sectionByHeading(page, "Neue Tasks");
  await expect(newTasksTile.locator("article")).toHaveCount(5);
  await expect(newTasksTile).not.toContainText("Auftrag 1");

  await newMarkerButton(taskRow(newTasksTile, page, "Auftrag 6")).click();

  await expect(newTasksTile).not.toContainText("Auftrag 6");
  await expect(newTasksTile).toContainText("Auftrag 1");
  await expect(newTasksTile.locator("article")).toHaveCount(5);
  expect(
    await prisma.readMarker.count({
      where: {
        taskId: newestTask.id,
        citizenId: viewer.entity.id,
      },
    }),
  ).toBe(1);

  // Without new tasks, the tile disappears
  for (let remaining = 4; remaining >= 0; remaining--) {
    await newMarkerButton(newTasksTile.locator("article").first()).click();
    await expect(newTasksTile.locator("article")).toHaveCount(remaining);
  }
  await expect(newTasksTile).toHaveCount(0);
  await openAppsPopover(page);
  await expect(appDot(page, "Tasks")).toHaveCount(0);
});

test("only open tasks of others created after the join date are new, and the tile leaves out assigned tasks", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "rm-filter-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "rm-filter-leser",
    permissionStrings: ["task;read"],
  });

  await createTask(prisma, creator, "Frischer Auftrag");
  await createTask(prisma, creator, "Zugewiesener Auftrag", {
    visibility: TaskVisibility.PERSONALIZED,
    assignments: {
      create: { citizenId: viewer.entity.id, createdById: creator.entity.id },
    },
  });
  await createTask(prisma, viewer, "Eigener Auftrag");
  await createTask(prisma, creator, "Alter Auftrag", {
    // Before the email confirmation of the viewer
    createdAt: new Date(Date.now() - ONE_HOUR_MS),
  });
  await createTask(prisma, creator, "Erledigter Auftrag", {
    completedAt: new Date(),
  });
  await createTask(prisma, creator, "Abgebrochener Auftrag", {
    cancelledAt: new Date(),
  });
  await createTask(prisma, creator, "Abgelaufener Auftrag", {
    expiresAt: new Date(Date.now() - ONE_MINUTE_MS),
  });

  await signIn(viewer.user);

  await page.goto("/app/dashboard");
  const newTasksTile = sectionByHeading(page, "Neue Tasks");
  await expect(newTasksTile.locator("article")).toHaveCount(1);
  await expect(newTasksTile).toContainText("Frischer Auftrag");
  await expect(
    newBadge(
      taskRow(
        sectionByHeading(page, "Meine Tasks"),
        page,
        "Zugewiesener Auftrag",
      ),
    ),
  ).toBeVisible();

  await page.goto("/app/tasks");
  await expect(page.locator("article")).toHaveCount(4);
  for (const title of ["Frischer Auftrag", "Zugewiesener Auftrag"])
    await expect(newBadge(taskRow(page, page, title))).toBeVisible();
  for (const title of ["Eigener Auftrag", "Alter Auftrag"])
    await expect(newBadge(taskRow(page, page, title))).toHaveCount(0);

  await page.goto("/app/tasks?status=new");
  await expect(page.locator("article")).toHaveCount(2);
  for (const title of ["Frischer Auftrag", "Zugewiesener Auftrag"])
    await expect(taskRow(page, page, title)).toBeVisible();

  await page.goto("/app/tasks?status=closed");
  await expect(page.locator("article")).toHaveCount(3);
  await expect(newBadge(page.locator("article"))).toHaveCount(0);
});

test("tasks from before the start of the read markers and invisible tasks are not new", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "rm-start-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "rm-start-leser",
    permissionStrings: ["task;read"],
    emailVerified: LONG_AGO,
  });

  await createTask(prisma, creator, "Auftrag vor dem Start", {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  await createTask(prisma, creator, "Persoenlicher Auftrag fuer andere", {
    visibility: TaskVisibility.PERSONALIZED,
  });

  await signIn(viewer.user);

  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: "Spynet" })).toBeVisible();
  await expect(sectionByHeading(page, "Neue Tasks")).toHaveCount(0);
  await openAppsPopover(page);
  await expect(appDot(page, "Tasks")).toHaveCount(0);

  // A visible new task lights up the dot badge of the Tasks app
  await createTask(prisma, creator, "Sichtbarer Auftrag");
  await page.reload();
  await openAppsPopover(page);
  await expect(appDot(page, "Tasks")).toBeVisible();
});

test("a new event stays new until one of its pages is opened", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "rm-event-ersteller",
    permissionStrings: ["event;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "rm-event-leser",
    permissionStrings: ["event;read"],
    emailVerified: new Date(Date.now() - ONE_DAY_MS),
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Morgenrot",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(viewer.user);

  await page.goto("/app/dashboard");
  await expect(
    newBadge(eventCard(page, page, "Operation Morgenrot")),
  ).toBeVisible();
  await openAppsPopover(page);
  await expect(appDot(page, "Events")).toBeVisible();

  // A subpage counts as well, not only the overview
  await page.goto(`/app/events/${event.id}/participants`);
  await expect
    .poll(() =>
      prisma.readMarker.count({
        where: {
          eventId: event.id,
          citizenId: viewer.entity.id,
        },
      }),
    )
    .toBe(1);

  await page.goto("/app/events");
  const card = eventCard(page, page, "Operation Morgenrot");
  await expect(card).toBeVisible();
  await expect(newBadge(card)).toHaveCount(0);
  await openAppsPopover(page);
  await expect(appDot(page, "Events")).toHaveCount(0);
});

test("the marker on an event card marks it as read, and the Neu status lists only new events", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "rm-filter-ersteller",
    permissionStrings: ["event;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "rm-filter-teilnehmer",
    permissionStrings: ["event;read"],
    emailVerified: new Date(Date.now() - ONE_DAY_MS),
  });
  const newEvent = await createAppEvent(prisma, {
    name: "Neue Operation",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  const readEvent = await createAppEvent(prisma, {
    name: "Gelesene Operation",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  await prisma.readMarker.create({
    data: { citizenId: viewer.entity.id, eventId: readEvent.id },
  });
  await createAppEvent(prisma, {
    name: "Vergangene Operation",
    createdById: creator.entity.id,
    startTime: new Date(Date.now() - 3 * ONE_HOUR_MS),
    endTime: new Date(Date.now() - 2 * ONE_HOUR_MS),
  });
  await createAppEvent(prisma, {
    name: "Eigene Operation",
    createdById: viewer.entity.id,
    ...futureEvent(),
  });
  const oldEvent = await createAppEvent(prisma, {
    name: "Alte Operation",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  await prisma.event.update({
    where: { id: oldEvent.id },
    // Before the email confirmation of the viewer
    data: { createdAt: new Date(Date.now() - 2 * ONE_DAY_MS) },
  });
  const outsiderRole = await createRole(prisma);
  await createAppEvent(prisma, {
    name: "Geheime Operation",
    createdById: creator.entity.id,
    visibility: EventVisibility.RESTRICTED,
    visibilityRoleIds: [outsiderRole.id],
    ...futureEvent(),
  });

  await signIn(viewer.user);

  await page.goto("/app/events?status=closed");
  const pastEvent = eventCard(page, page, "Vergangene Operation");
  await expect(pastEvent).toBeVisible();
  await expect(newBadge(pastEvent)).toHaveCount(0);

  await page.goto("/app/events?status=new");
  const card = eventCard(page, page, "Neue Operation");
  await expect(card).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);
  // After the list streamed in, thus the marker button is hydrated too
  await waitForAppShellHydration(page);

  await newMarkerButton(card).click();

  await expect(page.getByText("Keine Events gefunden")).toBeVisible();
  expect(
    await prisma.readMarker.count({
      where: {
        eventId: newEvent.id,
        citizenId: viewer.entity.id,
      },
    }),
  ).toBe(1);
});
