import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
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

/** Everything the profile of another citizen can show */
const FULL_VIEWER_PERMISSIONS = [
  "event;read",
  "citizen;read",
  "silcBalanceOfOtherCitizen;read",
  "penaltyEntry;read",
  "otherShips;read",
];

/** The same profile, seen through the permissions for the own citizen */
const OWN_PROFILE_PERMISSIONS = [
  "citizen;read",
  "silcBalanceOfCurrentCitizen;read",
  "ownPenaltyEntry;read",
  "ship;read",
];

const timezoneSelect = (page: Page) =>
  page.getByLabel("Zeitzone", { exact: true });
const daySelect = (page: Page) => page.getByLabel("Tag", { exact: true });
const monthSelect = (page: Page) => page.getByLabel("Monat", { exact: true });
const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Speichern" });

/**
 * Gives the citizen one of every metric the profile shows, plus the two
 * attributes they set themselves. The counted values are seeded next to
 * deleted and expired ones, which none of the metrics may count.
 */
const seedProfile = async (prisma: PrismaClient, citizen: Citizen) => {
  await prisma.entity.update({
    where: { id: citizen.entity.id },
    data: { timezone: "Europe/Berlin", birthdayDay: 24, birthdayMonth: 12 },
  });

  await createSilcTransaction(prisma, {
    receiverId: citizen.entity.id,
    value: 1234,
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
   * The values survive a reload …
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
  await expect(popover).toContainText("SILC");
  await expect(popover).toContainText("Strafpunkte");
  await expect(popover).toContainText("7");
  await expect(popover).toContainText("Flotte");
  await expect(popover).toContainText("Europe/Berlin");
  await expect(popover).toContainText(/\d{2}:\d{2} Uhr/);
  await expect(popover).toContainText("24. Dezember");
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

  /** The attributes need no permission of their own … */
  await expect(popover).toContainText("Europe/Berlin");
  await expect(popover).toContainText("24. Dezember");

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
  await expect(spynetSection).toContainText("SILC");
  await expect(spynetSection).toContainText("Strafpunkte");
  await expect(spynetSection).toContainText("Flotte");
  await expect(spynetSection).toContainText("Europe/Berlin");
  await expect(spynetSection).toContainText("24. Dezember");
  await expect(
    spynetSection.getByRole("link", { name: "Vollständiges Profil" }),
  ).toBeVisible();
});
