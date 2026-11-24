import type { Locator, Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import {
  EventSource,
  TaskRewardType,
  TaskVisibility,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  futureEvent,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  type TestCitizen,
} from "../fixtures/factories";
import {
  clickUntilUrl,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const CALENDAR_PAGE = "/app/calendar";

const calendarTile = (page: Page) => sectionByHeading(page, "Kalender");

const birthdayRow = (scope: Page | Locator, handle: string) =>
  scope.getByRole("article").filter({ hasText: `Geburtstag von ${handle}` });

const typeCheckbox = (page: Page, type: string) =>
  page.locator(`input[name="${type}"]`);

const monthDayFromToday = (days: number) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(Date.now() + days * ONE_DAY_MS));
  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { birthdayDay: readPart("day"), birthdayMonth: readPart("month") };
};

const dayHeading = (page: Page, days: number) =>
  page.getByRole("heading", {
    level: 2,
    name: new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(Date.now() + days * ONE_DAY_MS)),
  });

/** Always less than 12 months away, thus the list can show it */
const nextChristmasEve = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const isAfterChristmasEve = readPart("month") === 12 && readPart("day") > 24;

  return `${readPart("year") + Number(isAfterChristmasEve)}-12-24`;
};

const createBirthdayCitizen = async (prisma: PrismaClient, handle: string) => {
  const citizen = await createCitizen(prisma, { handle });
  await prisma.citizen.update({
    where: { id: citizen.entity.id },
    data: monthDayFromToday(2),
  });

  return citizen;
};

const createAcceptedTask = (
  prisma: PrismaClient,
  assignee: TestCitizen,
  title: string,
) =>
  prisma.task.create({
    data: {
      title,
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      expiresAt: new Date(Date.now() + 3 * ONE_DAY_MS),
      assignments: { create: { citizenId: assignee.entity.id } },
    },
  });

test("the dashboard tile shows the events, the birthdays and the own task deadlines of the next days", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "kalender-leser",
    permissionStrings: ["event;read", "citizen;read", "task;read"],
  });
  const other = await createBirthdayCitizen(prisma, "kalender-geburtstag");
  await createAppEvent(prisma, {
    name: "Kalender-Operation",
    createdById: other.entity.id,
    ...futureEvent(),
  });
  await createAcceptedTask(prisma, viewer, "Eigener Auftrag");
  // Public, thus the viewer can see it, but accepted by a different citizen
  await createAcceptedTask(prisma, other, "Fremder Auftrag");

  await signIn(viewer.user);
  await page.goto("/app/dashboard");

  const tile = calendarTile(page);
  await expect(
    tile.getByRole("heading", { name: "Kalender-Operation" }),
  ).toBeVisible();
  await expect(birthdayRow(tile, "kalender-geburtstag")).toBeVisible();
  await expect(
    tile.getByRole("link", { name: "Task-Frist: Eigener Auftrag" }),
  ).toBeVisible();
  await expect(tile.getByText("Fremder Auftrag")).toHaveCount(0);

  await clickUntilUrl(
    page,
    tile.getByRole("link", { name: "Zum Kalender" }),
    CALENDAR_PAGE,
  );
  await expect(
    page.getByRole("heading", { name: "Kalender-Operation" }),
  ).toBeVisible();

  // The whole row is clickable: a click into its padding, not on its title
  await birthdayRow(page, "kalender-geburtstag").click({
    position: { x: 8, y: 8 },
  });
  await expect(page).toHaveURL("/app/spynet/birthdays");

  await page.goto(CALENDAR_PAGE);
  await clickUntilUrl(
    page,
    birthdayRow(page, "kalender-geburtstag").getByRole("link", {
      name: "kalender-geburtstag",
      exact: true,
    }),
    `/app/spynet/citizen/${other.entity.id}`,
  );
});

test("a finished event leaves the tile and the upcoming list for the past list, a running event stays", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "kalender-status",
    permissionStrings: ["event;read"],
  });
  await createAppEvent(prisma, {
    name: "Beendete Operation",
    createdById: viewer.entity.id,
    startTime: new Date(Date.now() - 3 * ONE_HOUR_MS),
    endTime: new Date(Date.now() - ONE_HOUR_MS),
  });
  await createAppEvent(prisma, {
    name: "Laufende Operation",
    createdById: viewer.entity.id,
    startTime: new Date(Date.now() - 2 * ONE_DAY_MS),
    endTime: new Date(Date.now() + ONE_HOUR_MS),
  });
  const finishedEvent = page.getByRole("heading", {
    name: "Beendete Operation",
  });
  const runningEvent = page.getByRole("heading", {
    name: "Laufende Operation",
  });

  await signIn(viewer.user);
  await page.goto("/app/dashboard");
  await expect(runningEvent).toBeVisible();
  await expect(finishedEvent).toHaveCount(0);

  await page.goto(CALENDAR_PAGE);
  await expect(runningEvent).toBeVisible();
  await expect(finishedEvent).toHaveCount(0);

  await page.goto(`${CALENDAR_PAGE}?status=past`);
  await expect(finishedEvent).toBeVisible();
  await expect(runningEvent).toHaveCount(0);
});

test("a type switched off in the app disappears from the tile and stays off after a reload", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "kalender-filter",
    permissionStrings: ["citizen;read"],
  });
  await createBirthdayCitizen(prisma, "kalender-gefiltert");
  const filteredBirthdayRow = birthdayRow(page, "kalender-gefiltert");

  await signIn(viewer.user);
  await page.goto(CALENDAR_PAGE);
  await expect(filteredBirthdayRow).toBeVisible();
  await expect(typeCheckbox(page, "birthday")).toBeChecked();
  await waitForAppShellHydration(page);

  await toggleLabel(page, typeCheckbox(page, "birthday")).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(filteredBirthdayRow).toHaveCount(0);

  await page.reload();
  await expect(typeCheckbox(page, "birthday")).not.toBeChecked();
  await expect(typeCheckbox(page, "seasonal")).toBeChecked();
  await expect(filteredBirthdayRow).toHaveCount(0);

  await page.goto("/app/dashboard");
  await expect(
    calendarTile(page).getByRole("link", { name: "Zum Kalender" }),
  ).toBeVisible();
  await expect(filteredBirthdayRow).toHaveCount(0);

  const settings = await prisma.calendarEntryTypeSetting.findMany({
    where: { citizenId: viewer.entity.id },
  });
  expect(settings.map((setting) => setting.entryType)).toEqual(["birthday"]);
  await expectAuditEvents(prisma, ["CALENDAR_ENTRY_TYPE_SETTINGS_UPDATED"]);
});

test("the list shows each day of a page of 14 days, and the past starts today", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, { handle: "kalender-seiten" });
  await signIn(viewer.user);

  await page.goto(CALENDAR_PAGE);
  await waitForAppShellHydration(page);
  await expect(dayHeading(page, 0)).toBeVisible();
  await expect(dayHeading(page, 13)).toBeVisible();
  await expect(dayHeading(page, 14)).toHaveCount(0);

  await clickUntilUrl(
    page,
    page.getByRole("button", { name: "Weiter", exact: true }),
    /cursor=/,
  );
  await expect(dayHeading(page, 14)).toBeVisible();
  await expect(dayHeading(page, 0)).toHaveCount(0);

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(dayHeading(page, 0)).toBeVisible();

  await clickUntilUrl(page, toggleLabel(page, /^Vergangen$/), /status=past/);
  await expect(dayHeading(page, 0)).toBeVisible();
  await expect(dayHeading(page, 1)).toHaveCount(0);
  const todayBox = await dayHeading(page, 0).boundingBox();
  const lastDayBox = await dayHeading(page, -13).boundingBox();
  expect(todayBox!.y).toBeLessThan(lastDayBox!.y);
});

test("a user without event;read sees the seasonal entries but no events", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "kalender-ohne-events",
  });
  const christmasEve = nextChristmasEve();
  await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Weihnachtsfeier",
      startTime: new Date(`${christmasEve}T18:00:00.000Z`),
    },
  });

  await signIn(viewer.user);
  await page.goto(`${CALENDAR_PAGE}?cursor=${christmasEve}`);

  await expect(page.getByRole("heading", { name: "Weihnachten" })).toHaveCount(
    3,
  );
  await expect(page.getByText("Weihnachtsfeier")).toHaveCount(0);
  await expect(typeCheckbox(page, "seasonal")).toBeChecked();
  await expect(typeCheckbox(page, "event")).toHaveCount(0);

  await page.goto("/app/dashboard");
  await expect(
    calendarTile(page).getByRole("link", { name: "Zum Kalender" }),
  ).toBeVisible();
});
