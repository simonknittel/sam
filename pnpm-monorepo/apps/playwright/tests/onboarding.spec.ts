import type { Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { clickUntilVisible } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const onboardingButton = (page: Page) =>
  page.getByRole("button", { name: "Erste Schritte" });

/** The unread indicator of the trigger, independent of the classes drawing it */
const onboardingDot = (page: Page) =>
  onboardingButton(page).locator("[data-unread-dot]");

/**
 * The task list is mounted twice (top bar popover and the hidden mobile
 * flyout), so assertions are scoped to the open popover — Base UI renders
 * its popup with `role="dialog"`, named after its trigger.
 */
const popover = (page: Page) =>
  page.getByRole("dialog", { name: "Erste Schritte" });

const openOnboardingPopover = (page: Page) =>
  clickUntilVisible(
    onboardingButton(page),
    popover(page).getByText("Lerne das SAM mit kurzen Touren kennen."),
  );

const taskItem = (page: Page, title: string) =>
  popover(page).getByRole("listitem").filter({ hasText: title });

/** Every tour step is a dialog named after the step's title */
const stepDialog = (page: Page, title: string) =>
  page.getByRole("dialog", { name: title });

test("the popover lists only the permitted tasks with their step counts", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const withoutFleet = await createCitizen(prisma, { handle: "ohne-flotte" });
  await signIn(withoutFleet.user);

  await page.goto("/app");
  await expect(onboardingDot(page)).toBeVisible();
  await openOnboardingPopover(page);

  await expect(popover(page).getByRole("listitem")).toHaveCount(3);
  await expect(
    taskItem(page, "Lerne unser Flottenmanagement kennen"),
  ).toHaveCount(0);

  const withFleetAndEvents = await createCitizen(prisma, {
    handle: "mit-flotte",
    permissionStrings: ["ship;manage", "orgFleet;read", "event;read"],
  });
  await switchUser(withFleetAndEvents.user);

  await page.goto("/app");
  await openOnboardingPopover(page);

  await expect(popover(page).getByRole("listitem")).toHaveCount(5);
  await expect(
    taskItem(page, "Lerne unser Flottenmanagement kennen"),
  ).toContainText("0 von 3 Schritten");

  // The events task is permission-gated too, and sorted first
  const eventsTask = taskItem(page, "Lerne unsere Events kennen");
  await expect(eventsTask).toContainText("0 von 4 Schritten");
  await expect(popover(page).getByRole("listitem").first()).toContainText(
    "Lerne unsere Events kennen",
  );
});

test("a tour navigates to its pages, highlights the target and completes the task", async ({
  page,
  prisma,
  signIn,
}) => {
  // Without orgFleet;read the third step is filtered out (2 steps remain)
  const citizen = await createCitizen(prisma, {
    handle: "flotten-tourist",
    permissionStrings: ["ship;manage"],
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openOnboardingPopover(page);

  const fleetTask = taskItem(page, "Lerne unser Flottenmanagement kennen");
  await expect(fleetTask).toContainText("0 von 2 Schritten");
  await fleetTask.getByRole("button", { name: "Starten" }).click();

  await expect(popover(page)).not.toBeVisible();
  await expect(stepDialog(page, "Warum Flottenmanagement?")).toBeVisible();

  await stepDialog(page, "Warum Flottenmanagement?")
    .getByRole("button", { name: "Weiter" })
    .click();

  await expect(page).toHaveURL(/\/app\/fleet\/my-ships/);
  const addShipsStep = stepDialog(page, "Füge deine Schiffe hinzu");
  await expect(addShipsStep).toBeVisible();
  await expect(
    page.locator('[data-onboarding-target="fleet-add-ship"]'),
  ).toBeVisible();

  await addShipsStep.getByRole("button", { name: "Fertig" }).click();
  await expect(addShipsStep).not.toBeVisible();

  await expect
    .poll(() =>
      prisma.onboardingTaskProgress.findFirst({
        where: { citizenId: citizen.entity.id, taskKey: "fleet" },
      }),
    )
    .toMatchObject({ completionMethod: "TOUR" });
  await expect
    .poll(() =>
      prisma.onboardingStepProgress.count({
        where: { citizenId: citizen.entity.id, taskKey: "fleet" },
      }),
    )
    .toBe(2);

  await openOnboardingPopover(page);
  const completedFleetTask = taskItem(
    page,
    "Lerne unser Flottenmanagement kennen",
  );
  await expect(completedFleetTask).toContainText("Erledigt");
  await expect(
    completedFleetTask.getByRole("button", { name: "Wiederholen" }),
  ).toBeVisible();
});

test("the events tour highlights the dashboard calendar and shows screenshot steps", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "event-tourist",
    permissionStrings: ["event;read"],
  });
  await signIn(citizen.user);

  await page.goto("/app");
  await openOnboardingPopover(page);

  await taskItem(page, "Lerne unsere Events kennen")
    .getByRole("button", { name: "Starten" })
    .click();

  const calendarStep = stepDialog(page, "Der Eventkalender");
  await expect(calendarStep).toBeVisible();
  await expect(
    page.locator('[data-onboarding-target="dashboard-calendar"]'),
  ).toBeVisible();

  await calendarStep.getByRole("button", { name: "Weiter" }).click();

  // The sign-up step has no live event — it explains with a screenshot
  const signUpStep = stepDialog(page, "Für Events anmelden");
  await expect(signUpStep).toBeVisible();
  await expect(
    signUpStep.getByRole("img", { name: /Meine Teilnahme/ }),
  ).toBeVisible();

  await signUpStep.getByRole("button", { name: "Tour beenden" }).click();
  await expect(signUpStep).not.toBeVisible();
});

test("exiting a tour keeps the progress and resumes at the open step", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "abbrecher" });
  await signIn(citizen.user);

  await page.goto("/app");
  await openOnboardingPopover(page);

  await taskItem(page, "Aktiviere Browserbenachrichtigungen")
    .getByRole("button", { name: "Starten" })
    .click();

  await stepDialog(page, "Benachrichtigungen des SAM")
    .getByRole("button", { name: "Weiter" })
    .click();

  const enableStep = stepDialog(page, "Aktiviere die Benachrichtigungen");
  await expect(enableStep).toBeVisible();
  await enableStep.getByRole("button", { name: "Tour beenden" }).click();
  await expect(enableStep).not.toBeVisible();

  await openOnboardingPopover(page);
  const notificationsTask = taskItem(
    page,
    "Aktiviere Browserbenachrichtigungen",
  );
  await expect(notificationsTask).toContainText("1 von 2 Schritten");

  await notificationsTask.getByRole("button", { name: "Fortsetzen" }).click();

  await expect(page).toHaveURL(/\/app\/account\/notifications/);
  await expect(
    stepDialog(page, "Aktiviere die Benachrichtigungen"),
  ).toBeVisible();
});

test("skipping single tasks and mark-all clear the dot and store SKIPPED rows", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "ueberspringer" });
  await signIn(citizen.user);

  await page.goto("/app");
  await openOnboardingPopover(page);

  const avatarTask = taskItem(page, "Erstelle dir einen Sinister-Avatar");
  await avatarTask.getByRole("button", { name: "Überspringen" }).click();
  await expect(avatarTask).toContainText("Erledigt");

  await expect
    .poll(() =>
      prisma.onboardingTaskProgress.findFirst({
        where: { citizenId: citizen.entity.id, taskKey: "avatar-creator" },
      }),
    )
    .toMatchObject({ completionMethod: "SKIPPED" });

  await popover(page)
    .getByRole("button", { name: "Alle als erledigt markieren" })
    .click();
  await popover(page).getByRole("button", { name: "Ja" }).click();

  await expect(popover(page).getByText("Erledigt")).toHaveCount(3);
  await expect(onboardingDot(page)).not.toBeVisible();

  await expect
    .poll(() =>
      prisma.onboardingTaskProgress.count({
        where: { citizenId: citizen.entity.id },
      }),
    )
    .toBe(3);
});

test("a replay updates the stored timestamps and the completion method", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "wiederholer" });
  await signIn(citizen.user);

  await page.goto("/app");
  await openOnboardingPopover(page);

  const profileTask = taskItem(page, "Vervollständige dein Profil");
  await profileTask.getByRole("button", { name: "Überspringen" }).click();

  await expect
    .poll(() =>
      prisma.onboardingTaskProgress.findFirst({
        where: { citizenId: citizen.entity.id, taskKey: "profile" },
      }),
    )
    .toMatchObject({ completionMethod: "SKIPPED" });
  const skippedRow = await prisma.onboardingTaskProgress.findFirstOrThrow({
    where: { citizenId: citizen.entity.id, taskKey: "profile" },
  });

  await profileTask.getByRole("button", { name: "Wiederholen" }).click();

  const profileStep = stepDialog(page, "Zeitzone und Geburtstag");
  await expect(profileStep).toBeVisible();
  await profileStep.getByRole("button", { name: "Fertig" }).click();

  await expect
    .poll(async () => {
      const row = await prisma.onboardingTaskProgress.findFirstOrThrow({
        where: { citizenId: citizen.entity.id, taskKey: "profile" },
      });
      return {
        completionMethod: row.completionMethod,
        movedForward: row.completedAt > skippedRow.completedAt,
      };
    })
    .toEqual({ completionMethod: "TOUR", movedForward: true });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the mobile flyout offers the same onboarding entry", async ({
    page,
    prisma,
    signIn,
  }) => {
    const citizen = await createCitizen(prisma, { handle: "mobil-nutzer" });
    await signIn(citizen.user);

    await page.goto("/app");

    await clickUntilVisible(
      page.getByRole("button", { name: "Apps" }),
      onboardingButton(page),
    );
    await openOnboardingPopover(page);

    await taskItem(page, "Vervollständige dein Profil")
      .getByRole("button", { name: "Starten" })
      .click();

    await expect(page).toHaveURL(/\/app\/account\/profile/);
    const profileStep = stepDialog(page, "Zeitzone und Geburtstag");
    await expect(profileStep).toBeVisible();
    await profileStep.getByRole("button", { name: "Fertig" }).click();

    await expect
      .poll(() =>
        prisma.onboardingTaskProgress.findFirst({
          where: { citizenId: citizen.entity.id, taskKey: "profile" },
        }),
      )
      .toMatchObject({ completionMethod: "TOUR" });
  });
});
