import type { Locator, Page } from "@playwright/test";
import {
  assignRole,
  createAppEvent,
  createCitizen,
  createFlow,
  createProfitDistributionCycle,
  createRole,
  createVariant,
  EventVisibility,
  futureEvent,
} from "../fixtures/factories";
import {
  accessibilityTree,
  clickUntilVisible,
  DELETED_TEXT,
  fillUntilValue,
  modal,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The confirmation dialog (`AlertDialog`) is a native modal `<dialog>`
 * inside the form that it submits. These tests examine the dialog itself;
 * the specs of the features examine what their confirmations do.
 */

const rootOverflow = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).overflow);

/**
 * Presses Tab a number of times. For each press: true when the focus is in
 * the dialog, false when it is on the page outside the dialog, null when no
 * element of the page has the focus (the focus is in the browser).
 */
const tabStops = async (page: Page, dialog: Locator, presses: number) => {
  const stops: (boolean | null)[] = [];
  for (let press = 0; press < presses; press++) {
    await page.keyboard.press("Tab");
    stops.push(
      await dialog.evaluate((dialogElement) =>
        document.activeElement === document.body
          ? null
          : dialogElement.contains(document.activeElement),
      ),
    );
  }
  return stops;
};

/**
 * The names of the buttons in the accessibility tree. The names are in lower
 * case: the tree applies the CSS `uppercase`.
 */
const accessibleButtonNames = async (page: Page) =>
  (await accessibilityTree(page))
    .filter((node) => node.role === "button")
    .map((node) => node.name.toLowerCase());

test("the keyboard and the page behind an open confirmation dialog", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "dialog-admin",
    permissionStrings: ["citizen;read", "citizen;delete"],
  });
  const target = await createCitizen(prisma, { handle: "dialog-ziel" });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);
  await waitForAppShellHydration(page);

  const trigger = page.getByRole("button", { name: "Löschen" });
  const dialog = page.getByRole("alertdialog");

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveAccessibleName("Citizen löschen?");
  await expect(dialog).toHaveAccessibleDescription(
    /Willst du den Citizen dialog-ziel löschen\?/,
  );
  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();

  /** The focus goes through the dialog and the browser, never to the page */
  const stops = await tabStops(page, dialog, 5);
  expect(stops).toContain(true);
  expect(stops).not.toContain(false);

  /** The page behind the dialog is inert and does not scroll */
  expect(await accessibleButtonNames(page)).toEqual(["abbrechen", "löschen"]);
  expect(await rootOverflow(page)).toBe("hidden");

  /** A click on the backdrop does not close a confirmation dialog */
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await rootOverflow(page)).not.toBe("hidden");
  expect(await accessibleButtonNames(page)).toContain("benachrichtigungen");

  await trigger.click();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  await expect
    .poll(async () => {
      const citizen = await prisma.citizen.findUniqueOrThrow({
        where: { id: target.entity.id },
      });
      return citizen.deletedAt !== null;
    })
    .toBe(true);
});

test("an invalid field in the confirmation dialog stops the submission", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "dialog-manager",
    permissionStrings: ["career;manage", "otherRole;read;roleId=*"],
  });
  const flow = await createFlow(prisma, { name: "Flotte", slug: "flotte" });
  await prisma.flow.update({
    where: { id: flow.id },
    data: { deletedAt: new Date() },
  });

  await signIn(manager.user);
  await page.goto("/app/career/settings?status=deleted");

  const dialog = page.getByRole("alertdialog", {
    name: "Karrierebaum wiederherstellen?",
  });
  const trigger = page
    .getByRole("table")
    .getByRole("button", { name: "Wiederherstellen" });
  await clickUntilVisible(trigger, dialog);

  const slug = dialog.getByLabel("Slug");
  await slug.fill("");
  await dialog.getByRole("button", { name: "Wiederherstellen" }).click();
  await expect(dialog).toBeVisible();
  expect(
    await slug.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    ),
  ).toBe(true);

  /** "Abbrechen" discards the input */
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await trigger.click();
  await expect(slug).toHaveValue("flotte");

  /** Enter in a field of the dialog submits */
  await slug.fill("flotte-neu");
  await slug.press("Enter");
  await expect(page.getByText("wiederhergestellt")).toBeVisible();
  await expect
    .poll(() => prisma.flow.findUniqueOrThrow({ where: { id: flow.id } }))
    .toMatchObject({ deletedAt: null, slug: "flotte-neu" });
});

test("a confirmation dialog in a popover keeps the popover open", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "rollen-admin",
    permissionStrings: [
      "citizen;read",
      "otherRole;read;roleId=*",
      "otherRole;dismiss;roleId=*",
    ],
  });
  const member = await createCitizen(prisma, { handle: "rollen-mitglied" });
  const role = await createRole(prisma, { name: "Testrolle" });
  await assignRole(prisma, member.entity, role);

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${member.entity.id}/roles`);
  await waitForAppShellHydration(page);

  const popover = page.getByRole("dialog", { name: "Rollendetails" });
  await clickUntilVisible(
    page.getByRole("button").filter({ hasText: "Testrolle" }),
    popover,
  );

  const trigger = popover.getByRole("button", { name: "Entfernen" });
  const dialog = page.getByRole("alertdialog", { name: "Rolle entfernen?" });
  await trigger.click();
  await expect(dialog).toBeVisible();

  /** The popover opens on hover, but the pointer on the backdrop keeps it */
  await page.mouse.move(5, 5);
  await expect(dialog).toBeVisible();
  await expect(popover).toBeVisible();

  /** Escape closes only the dialog, and the focus goes back into the popover */
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(popover).toBeVisible();
  await expect(trigger).toBeFocused();

  /** Also after a click on the backdrop or on the text of the dialog */
  for (const clickInDialog of [
    () => page.mouse.click(5, 5),
    () => dialog.getByRole("heading").click(),
  ]) {
    await trigger.click();
    await clickInDialog();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(popover).toBeVisible();
  }

  await trigger.click();
  await dialog.getByRole("button", { name: "Entfernen" }).click();
  await expect
    .poll(() =>
      prisma.roleAssignment.count({
        where: { citizenId: member.entity.id, roleId: role.id },
      }),
    )
    .toBe(0);
});

test("a confirmation dialog in the row actions keeps the actions open", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "flotten-admin",
    permissionStrings: ["manufacturersSeriesAndVariants;manage"],
  });
  const { manufacturer, series, variant } = await createVariant(prisma, {
    manufacturerName: "Aegis Dynamics",
    seriesName: "Avenger",
    variantName: "Avenger Titan",
  });

  await signIn(admin.user);
  await page.goto(
    `/app/fleet/settings/manufacturer/${manufacturer.id}/series/${series.id}`,
  );

  const actions = page.getByRole("dialog", { name: "Aktionen" });
  const trigger = actions.getByRole("button", { name: "Löschen", exact: true });
  const dialog = page.getByRole("alertdialog", { name: "Variante löschen?" });
  await clickUntilVisible(
    page
      .getByRole("row")
      .filter({ hasText: variant.name })
      .getByRole("button", { name: "Aktionen" }),
    trigger,
  );

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(actions).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole("button", { name: "Löschen" }).click();
  await expect
    .poll(() => prisma.variant.count({ where: { id: variant.id } }))
    .toBe(0);
});

test("Escape in a confirmation dialog in a modal closes only the dialog", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "geheim-ersteller",
    permissionStrings: ["event;read", "event;create"],
  });

  await signIn(creator.user);
  await page.goto("/app/events");
  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  await fillUntilValue(page.getByLabel("Titel"), "Operation Escape");
  await fillUntilValue(page.getByLabel("Start"), "2027-06-01T20:00");
  await fillUntilValue(page.getByLabel("Ende"), "2027-06-01T22:00");
  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await toggleLabel(page, /^Eingeschränkt$/).click();
  const trigger = page.getByRole("button", { name: "Speichern" });
  await trigger.click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(modal(page, "Neues Event")).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("Titel")).toHaveValue("Operation Escape");
  expect(await prisma.event.count()).toBe(0);
});

test("the browser validates the form before the confirmation dialog opens", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "pruef-ersteller",
    permissionStrings: ["event;read", "event;create"],
  });

  await signIn(creator.user);
  await page.goto("/app/events");
  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  await fillUntilValue(page.getByLabel("Start"), "2027-06-01T20:00");
  await fillUntilValue(page.getByLabel("Ende"), "2027-06-01T22:00");
  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await toggleLabel(page, /^Eingeschränkt$/).click();

  /** The title is empty: the browser shows the error, the dialog stays closed */
  const title = page.getByLabel("Titel");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(title).toBeFocused();
  expect(
    await title.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    ),
  ).toBe(true);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await title.fill("Operation Pflichtfeld");
  await page.getByRole("button", { name: "Speichern" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await prisma.event.count()).toBe(0);
});

test("Enter in a field of the Discord card asks for the confirmation of a restricted event", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const allowedRole = await createRole(prisma, { name: "eingeweihte" });
  const creator = await createCitizen(prisma, {
    handle: "enter-discord-orga",
    permissionStrings: ["event;read"],
  });
  await assignRole(prisma, creator.entity, allowedRole);
  const event = await createAppEvent(prisma, {
    name: "Operation Eingabetaste",
    createdById: creator.entity.id,
    visibility: EventVisibility.RESTRICTED,
    visibilityRoleIds: [allowedRole.id],
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);

  const location = page.getByRole("textbox", { name: "Ort" });
  await location.fill("Hangar 3");
  await location.press("Enter");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(location).toBeFocused();
  expect(discordMock.scheduledEvents.size).toBe(0);

  await location.press("Enter");
  await dialog
    .getByRole("button", { name: "Trotzdem veröffentlichen" })
    .click();
  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible();
  expect(discordMock.scheduledEvents.size).toBe(1);
});

test("Enter in a field of the payout preparation asks for the confirmation", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "sincome-verwalter",
    permissionStrings: [
      "profitDistributionCycle;manage",
      "silcTransactionOfOtherCitizen;read",
      "silcBalanceOfOtherCitizen;read",
      "silcBalanceOfCurrentCitizen;read",
    ],
  });
  const cycle = await createProfitDistributionCycle(prisma, {
    title: "Q4 Zyklus",
    createdById: admin.entity.id,
  });
  await prisma.profitDistributionCycle.update({
    where: { id: cycle.id },
    data: { collectionEndedAt: new Date() },
  });

  await signIn(admin.user);
  await page.goto(`/app/sincome/${cycle.id}/management`);
  await waitForAppShellHydration(page);

  const field = page.getByLabel("Gesamter aUEC-Überschuss");
  await fillUntilValue(field, "500.000");
  await field.press("Enter");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(field).toBeFocused();
  const unchanged = await prisma.profitDistributionCycle.findUniqueOrThrow({
    where: { id: cycle.id },
  });
  expect(unchanged.payoutStartedAt).toBeNull();
});
