import type { Locator, Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { randomUUID } from "node:crypto";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createSilcTransaction,
  createVariant,
  futureEvent,
  ONE_DAY_MS,
  type Citizen,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  hoverUntilVisible,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const NOT_SET_LABEL = "Nicht angegeben";

/**
 * Everything the profile of another citizen can show. The `…Transaction…`
 * permission shows no metric of its own; it opens the Spynet page behind the
 * SILC box.
 */
const FULL_VIEWER_PERMISSIONS = [
  "event;read",
  "citizen;read",
  "silcBalanceOfOtherCitizen;read",
  "silcTransactionOfOtherCitizen;read",
  "penaltyEntry;read",
  "otherShips;read",
];

/** The same profile, seen through the permissions for the own citizen */
const OWN_PROFILE_PERMISSIONS = [
  "citizen;read",
  "silcBalanceOfCurrentCitizen;read",
  "silcTransactionOfCurrentCitizen;read",
  "ownPenaltyEntry;read",
  "ship;read",
  /** The Spynet fleet page asks for this, also for the own fleet */
  "otherShips;read",
];

const timezoneSelect = (page: Page) =>
  page.getByLabel("Zeitzone", { exact: true });
const daySelect = (page: Page) => page.getByLabel("Tag", { exact: true });
const monthSelect = (page: Page) => page.getByLabel("Monat", { exact: true });
const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Speichern" });

/**
 * Gives the citizen one of every metric the profile shows, plus the time
 * zone they set themselves. The counted values are seeded next to
 * deleted and expired ones, which none of the metrics may count.
 */
/** Every metric box links to the Spynet page which holds its details */
const expectMetricLinks = async (scope: Locator, citizenId: string) => {
  const spynetHref = `/app/spynet/citizen/${citizenId}`;

  for (const [label, subPage] of [
    ["SILC", "silc"],
    ["Strafpunkte", "penalty-points"],
    ["Flotte", "fleet"],
  ]) {
    await expect(scope.getByRole("link", { name: label })).toHaveAttribute(
      "href",
      `${spynetHref}/${subPage}`,
    );
  }
};

const seedProfile = async (prisma: PrismaClient, citizen: Citizen) => {
  await prisma.entity.update({
    where: { id: citizen.entity.id },
    data: { timezone: "Europe/Berlin" },
  });

  await createSilcTransaction(prisma, {
    receiverId: citizen.entity.id,
    value: 1234,
  });

  /** The SILC box carries the monthly salary of the citizen's roles */
  await prisma.silcRoleSalary.create({
    data: { roleId: citizen.role.id, value: 50, dayOfMonth: 1 },
  });

  await prisma.penaltyEntry.createMany({
    data: [
      {
        citizenId: citizen.entity.id,
        createdById: citizen.entity.id,
        points: 3,
      },
      {
        citizenId: citizen.entity.id,
        createdById: citizen.entity.id,
        points: 4,
      },
      {
        citizenId: citizen.entity.id,
        createdById: citizen.entity.id,
        points: 5,
        expiresAt: new Date(Date.now() - ONE_DAY_MS),
      },
      {
        citizenId: citizen.entity.id,
        createdById: citizen.entity.id,
        points: 6,
        deletedAt: new Date(),
      },
    ],
  });

  const { variant } = await createVariant(prisma, {
    manufacturerName: "Roberts Space Industries",
    seriesName: "Polaris",
    variantName: "Polaris",
  });
  await prisma.ship.createMany({
    data: [
      { ownerId: citizen.entity.id, variantId: variant.id },
      { ownerId: citizen.entity.id, variantId: variant.id },
      {
        ownerId: citizen.entity.id,
        variantId: variant.id,
        deletedAt: new Date(),
      },
    ],
  });
};

test("a citizen sets, keeps and clears their time zone and birthday", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "profil-pfleger" });
  await signIn(citizen.user);

  await page.goto("/app/account/profile");
  await waitForAppShellHydration(page);

  await timezoneSelect(page).selectOption("Europe/Berlin");
  await monthSelect(page).selectOption({ label: "Dezember" });
  await daySelect(page).selectOption({ label: "24" });
  await saveButton(page).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  expect(
    await prisma.entity.findUniqueOrThrow({
      where: { id: citizen.entity.id },
      select: { timezone: true, birthdayDay: true, birthdayMonth: true },
    }),
  ).toEqual({
    timezone: "Europe/Berlin",
    birthdayDay: 24,
    birthdayMonth: 12,
  });

  await expectAuditEvents(prisma, ["CITIZEN_PROFILE_UPDATED"]);

  /**
   * The selects keep the saved values instead of falling back to
   * "Nicht angegeben" …
   */
  await expect(timezoneSelect(page)).toHaveValue("Europe/Berlin");
  await expect(monthSelect(page)).toHaveValue("12");
  await expect(daySelect(page)).toHaveValue("24");

  /**
   * … the values survive a reload …
   */
  await page.reload();
  await expect(timezoneSelect(page)).toHaveValue("Europe/Berlin");
  await expect(monthSelect(page)).toHaveValue("12");
  await expect(daySelect(page)).toHaveValue("24");

  /**
   * … and both attributes can be cleared again. Clearing the month clears
   * the day with it, because a birthday is only ever complete or absent.
   */
  await waitForAppShellHydration(page);
  await timezoneSelect(page).selectOption({ label: NOT_SET_LABEL });
  await monthSelect(page).selectOption({ label: NOT_SET_LABEL });
  await expect(daySelect(page)).toHaveValue("");
  await saveButton(page).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  expect(
    await prisma.entity.findUniqueOrThrow({
      where: { id: citizen.entity.id },
      select: { timezone: true, birthdayDay: true, birthdayMonth: true },
    }),
  ).toEqual({ timezone: null, birthdayDay: null, birthdayMonth: null });
});

test("a birthday without a month is rejected", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "halber-geburtstag" });
  await signIn(citizen.user);

  await page.goto("/app/account/profile");
  await waitForAppShellHydration(page);

  /**
   * A day that the chosen month does not have cannot even be picked: the
   * day list follows the month.
   */
  await monthSelect(page).selectOption({ label: "Februar" });
  await expect(daySelect(page).locator("option")).toHaveCount(
    1 /* Nicht angegeben */ + 29,
  );
  await monthSelect(page).selectOption({ label: NOT_SET_LABEL });

  await daySelect(page).selectOption({ label: "15" });
  await saveButton(page).click();

  await expect(
    page.getByText("Gib für den Geburtstag den Tag und den Monat an."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  /** The rejected input stays in the form, ready to be corrected */
  await expect(daySelect(page)).toHaveValue("15");

  expect(
    await prisma.entity.findUniqueOrThrow({
      where: { id: citizen.entity.id },
      select: { birthdayDay: true, birthdayMonth: true },
    }),
  ).toEqual({ birthdayDay: null, birthdayMonth: null });
});

test("the popover shows the profile of another citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, { handle: "profil-inhaber" });
  await seedProfile(prisma, owner);
  const viewer = await createCitizen(prisma, {
    handle: "profil-betrachter",
    permissionStrings: FULL_VIEWER_PERMISSIONS,
  });

  const event = await createAppEvent(prisma, {
    name: "Operation Steckbrief",
    createdById: owner.entity.id,
    ...futureEvent(),
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}`);

  const popover = page.getByRole("dialog", { name: "Citizen-Details" });
  await hoverUntilVisible(
    page.getByRole("link", { name: owner.entity.handle! }).first(),
    popover,
  );

  await expect(popover).toContainText(owner.entity.handle!);
  await expect(popover).toContainText("1.234");
  await expect(popover).toContainText("+50 monatlich");
  await expect(popover).toContainText("SILC");
  await expect(popover).toContainText("Strafpunkte");
  await expect(popover).toContainText("7");
  await expect(popover).toContainText("Flotte");
  await expect(popover).toContainText("Europe/Berlin");
  await expect(popover).toContainText(/\d{2}:\d{2} Uhr/);

  /** Every metric opens its Spynet page */
  await expectMetricLinks(popover, owner.entity.id);
});

test("the popover hides the metrics a viewer must not see", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, { handle: "verdeckter-inhaber" });
  await seedProfile(prisma, owner);
  const viewer = await createCitizen(prisma, {
    handle: "eingeschraenkter-betrachter",
    permissionStrings: ["event;read", "citizen;read"],
  });

  const event = await createAppEvent(prisma, {
    name: "Operation Verschlusssache",
    createdById: owner.entity.id,
    ...futureEvent(),
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}`);

  const popover = page.getByRole("dialog", { name: "Citizen-Details" });
  await hoverUntilVisible(
    page.getByRole("link", { name: owner.entity.handle! }).first(),
    popover,
  );

  /** The time zone needs no permission of its own … */
  await expect(popover).toContainText("Europe/Berlin");

  /** … but every metric does, and none of them is shown as a zero */
  await expect(popover).not.toContainText("SILC");
  await expect(popover).not.toContainText("Strafpunkte");
  await expect(popover).not.toContainText("Flotte");
});

test("the dashboard tile shows the profile of the own citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "eigener-profilinhaber",
    permissionStrings: OWN_PROFILE_PERMISSIONS,
  });
  await seedProfile(prisma, citizen);

  await signIn(citizen.user);
  await page.goto("/app/dashboard");

  const spynetSection = sectionByHeading(page, "Spynet");
  await expect(spynetSection).toContainText(citizen.entity.handle!);
  await expect(spynetSection).toContainText("1.234");
  await expect(spynetSection).toContainText("+50 monatlich");
  await expect(spynetSection).toContainText("SILC");
  await expect(spynetSection).toContainText("Strafpunkte");
  await expect(spynetSection).toContainText("Flotte");
  await expect(spynetSection).toContainText("Europe/Berlin");
  /** The header of the tile is the way into Spynet */
  await expect(
    spynetSection.getByRole("link", { name: "Spynet öffnen" }),
  ).toHaveAttribute("href", `/app/spynet/citizen/${citizen.entity.id}`);

  await expectMetricLinks(spynetSection, citizen.entity.id);
});

test("the dashboard tile hides what the own permissions do not cover", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "eingeschraenkter-profilinhaber",
    /** `ship;read` shows the fleet count, `otherShips;read` opens its page */
    permissionStrings: ["citizen;read", "ship;read"],
  });
  await seedProfile(prisma, citizen);

  await signIn(citizen.user);
  await page.goto("/app/dashboard");

  const spynetSection = sectionByHeading(page, "Spynet");
  await expect(spynetSection).toContainText(citizen.entity.handle!);
  await expect(spynetSection).not.toContainText("SILC");
  await expect(spynetSection).not.toContainText("Strafpunkte");

  /** The metric shows, but it stays a plain box: its page stays closed */
  await expect(spynetSection).toContainText("Flotte");
  await expect(spynetSection.getByRole("link", { name: "Flotte" })).toHaveCount(
    0,
  );
});

/** The birthday list reads the day in the time zone of the organization */
const BIRTHDAY_LIST_TIMEZONE = "Europe/Berlin";

/**
 * Whole calendar days from today, the way the page counts them. Adding
 * `ONE_DAY_MS` to the current moment instead would land one day off across
 * a daylight-saving transition of Europe/Berlin.
 */
const berlinDate = (daysFromToday: number) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BIRTHDAY_LIST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const readNumber = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  const target = new Date(
    Date.UTC(readNumber("year"), readNumber("month") - 1, readNumber("day")) +
      daysFromToday * ONE_DAY_MS,
  );

  return { day: target.getUTCDate(), month: target.getUTCMonth() + 1 };
};

interface BirthdayCitizenOptions {
  readonly handle: string;
  readonly day: number;
  readonly month: number;
  readonly permissionStrings?: readonly string[];
}

/**
 * A citizen who can sign in and whose birthday falls on the given day. The
 * time zone is the one of the organization, thus the list and the avatar of
 * the citizen name the same day.
 */
const createCitizenWithBirthday = async (
  prisma: PrismaClient,
  { handle, day, month, permissionStrings }: BirthdayCitizenOptions,
) => {
  const citizen = await createCitizen(prisma, { handle, permissionStrings });

  await prisma.entity.update({
    where: { id: citizen.entity.id },
    data: {
      timezone: BIRTHDAY_LIST_TIMEZONE,
      birthdayDay: day,
      birthdayMonth: month,
    },
  });

  return citizen;
};

test("the birthday list names every citizen once, sorted by the next birthday", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "geburtstags-betrachter",
    permissionStrings: ["citizen;read"],
  });

  const today = berlinDate(0);
  const tomorrow = berlinDate(1);
  const inTenDays = berlinDate(10);

  await createCitizenWithBirthday(prisma, {
    handle: "geburtstagskind-heute",
    ...today,
  });
  await createCitizenWithBirthday(prisma, {
    handle: "geburtstagskind-morgen",
    ...tomorrow,
  });
  await createCitizenWithBirthday(prisma, {
    handle: "geburtstagskind-spaeter",
    ...inTenDays,
  });
  /** Without a birthday nobody appears in the list */
  await createCitizen(prisma, { handle: "ohne-geburtstag" });

  /**
   * A citizen without a role that grants the login permission never gets a
   * greeting either, thus the list leaves them out.
   */
  const lockedOut = await prisma.entity.create({
    data: {
      handle: "ohne-zugang",
      discordId: randomUUID(),
      createdById: viewer.user.id,
      birthdayDay: today.day,
      birthdayMonth: today.month,
    },
  });

  await signIn(viewer.user);
  await page.goto("/app/spynet/birthdays");

  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: "geburtstagskind-heute" })).toContainText(
    "heute",
  );
  await expect(
    rows.filter({ hasText: "geburtstagskind-morgen" }),
  ).toContainText("morgen");
  await expect(
    rows.filter({ hasText: "geburtstagskind-spaeter" }),
  ).toContainText("in 10 Tagen");

  await expect(page.getByText("ohne-geburtstag")).toHaveCount(0);
  await expect(page.getByText(lockedOut.handle!)).toHaveCount(0);

  /** Every citizen stands in the list exactly once, the nearest one first */
  const handles = await rows.allInnerTexts();
  const listed = handles.filter((row) => row.includes("geburtstagskind"));
  expect(listed).toHaveLength(3);
  expect(listed[0]).toContain("geburtstagskind-heute");
  expect(listed[1]).toContain("geburtstagskind-morgen");
  expect(listed[2]).toContain("geburtstagskind-spaeter");
});

/** The mark of a citizen who has their birthday today, wherever it sits */
const birthdayHats = (scope: Page | Locator) =>
  scope.getByRole("img", { name: "Hat heute Geburtstag" });

test("the party hat marks the citizen whose birthday is today", async ({
  page,
  prisma,
  signIn,
}) => {
  const today = berlinDate(0);
  const tomorrow = berlinDate(1);

  const birthdayChild = await createCitizenWithBirthday(prisma, {
    handle: "hut-traeger",
    ...today,
    permissionStrings: ["citizen;read"],
  });
  const nextInLine = await createCitizenWithBirthday(prisma, {
    handle: "morgen-dran",
    ...tomorrow,
    permissionStrings: ["citizen;read"],
  });

  /** The whole suite runs with reduced motion, see playwright.config.ts */
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await signIn(birthdayChild.user);

  /** The own profile tile of the dashboard and the account avatar above it */
  await page.goto("/app/dashboard");
  const profileTile = sectionByHeading(page, "Spynet");
  await expect(birthdayHats(profileTile)).toBeVisible();
  await expect(
    birthdayHats(page.getByRole("button", { name: "Account" })),
  ).toBeVisible();

  /** The avatar of the birthday child celebrates with confetti */
  await expect(profileTile.locator("[data-confetti-canvas]")).toBeVisible();

  /** The list marks the row of today, and only that row */
  await page.goto("/app/spynet/birthdays");
  const rows = page.getByRole("row");
  await expect(
    birthdayHats(rows.filter({ hasText: birthdayChild.entity.handle! })),
  ).toBeVisible();
  await expect(
    birthdayHats(rows.filter({ hasText: nextInLine.entity.handle! })),
  ).toHaveCount(0);
});

/**
 * The hat of another citizen, which travels through the profile query
 * instead of through the session.
 */
test("the popover carries the party hat of the citizen it is about", async ({
  page,
  prisma,
  signIn,
}) => {
  const today = berlinDate(0);
  const tomorrow = berlinDate(1);

  const birthdayChild = await createCitizenWithBirthday(prisma, {
    handle: "hut-im-popover",
    ...today,
  });
  const nextInLine = await createCitizenWithBirthday(prisma, {
    handle: "morgen-im-popover",
    ...tomorrow,
  });

  const viewer = await createCitizen(prisma, {
    handle: "hut-betrachter",
    permissionStrings: ["citizen;read"],
  });
  await signIn(viewer.user);

  await page.goto("/app/spynet/birthdays");
  const popover = page.getByRole("dialog", { name: "Citizen-Details" });

  await hoverUntilVisible(
    page.getByRole("link", { name: birthdayChild.entity.handle! }).first(),
    popover,
  );
  await expect(birthdayHats(popover)).toBeVisible();

  /** The popover closes with the pointer, thus the next one stands alone */
  await page.mouse.move(0, 0);
  await expect(popover).toHaveCount(0);

  await hoverUntilVisible(
    page.getByRole("link", { name: nextInLine.entity.handle! }).first(),
    popover,
  );
  await expect(popover).toContainText(nextInLine.entity.handle!);
  await expect(birthdayHats(popover)).toHaveCount(0);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the account avatar of the flyout wears the party hat", async ({
    page,
    prisma,
    signIn,
  }) => {
    const citizen = await createCitizenWithBirthday(prisma, {
      handle: "mobiler-hut",
      ...berlinDate(0),
    });

    await signIn(citizen.user);
    await page.goto("/app");

    const actionBar = page.locator("nav");
    await actionBar.getByRole("button", { name: "Apps" }).click();

    await expect(birthdayHats(actionBar)).toBeVisible();
  });
});
