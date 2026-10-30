import type { Page } from "@playwright/test";
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

/**
 * The checkbox itself is sr-only — the visible control is the box its
 * wrapping label draws, thus a toggle goes through that label.
 */
const typeCheckbox = (page: Page, type: string) =>
  page.locator(`input[name="${type}"]`);

/** The day and the month some days after today, in the time zone of the app */
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

/** A citizen who can sign in, with a birthday in two days */
const createBirthdayCitizen = async (prisma: PrismaClient, handle: string) => {
  const citizen = await createCitizen(prisma, { handle });
  await prisma.citizen.update({
    where: { id: citizen.entity.id },
    data: monthDayFromToday(2),
  });

  return citizen;
};

/** A public task that the assignee accepted, which expires in three days */
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
  await expect(
    tile.getByRole("link", { name: "Geburtstag von kalender-geburtstag" }),
  ).toBeVisible();
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
  await page
    .getByRole("article")
    .filter({ hasText: "Geburtstag von kalender-geburtstag" })
    .click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL("/app/spynet/birthdays");
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
  const birthdayRow = page.getByRole("link", {
    name: "Geburtstag von kalender-gefiltert",
  });

  await signIn(viewer.user);
  await page.goto(CALENDAR_PAGE);
  await expect(birthdayRow).toBeVisible();
  await expect(typeCheckbox(page, "birthday")).toBeChecked();
  // The checkbox saves once, thus the page has to be hydrated first
  await waitForAppShellHydration(page);

  await toggleLabel(page, typeCheckbox(page, "birthday")).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(birthdayRow).toHaveCount(0);

  await page.reload();
  await expect(typeCheckbox(page, "birthday")).not.toBeChecked();
  await expect(typeCheckbox(page, "seasonal")).toBeChecked();
  await expect(birthdayRow).toHaveCount(0);

  await page.goto("/app/dashboard");
  await expect(
    calendarTile(page).getByRole("link", { name: "Zum Kalender" }),
  ).toBeVisible();
  await expect(birthdayRow).toHaveCount(0);

  const settings = await prisma.calendarEntryTypeSetting.findMany({
    where: { citizenId: viewer.entity.id },
  });
  expect(settings.map((setting) => setting.entryType)).toEqual(["birthday"]);
  await expectAuditEvents(prisma, ["CALENDAR_ENTRY_TYPE_SETTINGS_UPDATED"]);
});

test("a range of more than 12 months shows a message instead of the entries", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, { handle: "kalender-zeitraum" });
  await signIn(viewer.user);

  await page.goto(`${CALENDAR_PAGE}?from=2030-01-01&to=2031-01-02`);

  await expect(
    page.getByText("Der Zeitraum ist länger als 12 Monate."),
  ).toBeVisible();
});

test("a user without event;read sees the seasonal entries but no events", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "kalender-ohne-events",
  });
  await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Weihnachtsfeier",
      startTime: new Date("2030-12-24T18:00:00.000Z"),
    },
  });

  await signIn(viewer.user);
  await page.goto(`${CALENDAR_PAGE}?from=2030-12-20&to=2030-12-31`);

  await expect(page.getByRole("heading", { name: "Weihnachten" })).toHaveCount(
    3,
  );
  await expect(page.getByText("Weihnachtsfeier")).toHaveCount(0);
  // The filter offers only the types that the user can read
  await expect(typeCheckbox(page, "seasonal")).toBeChecked();
  await expect(typeCheckbox(page, "event")).toHaveCount(0);

  // The tile shows for everybody, also without `event;read`
  await page.goto("/app/dashboard");
  await expect(
    calendarTile(page).getByRole("link", { name: "Zum Kalender" }),
  ).toBeVisible();
});
