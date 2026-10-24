import type { Page } from "@playwright/test";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createOnSiteNotification,
  createRole,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilUrl,
  fillUntilValue,
  modal,
  pickFromSearch,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The citizen picker of the create form loads the roster through tRPC */
const SENDER_PERMISSIONS = ["manualNotification;manage", "citizen;read"];

const MANUAL_NOTIFICATIONS_PAGE = "/app/manual-notifications";
const EMPTY_TEXT = "Keine Benachrichtigungen gefunden.";
/** The success text of the create action */
const SENT_TEXT = "Die Benachrichtigung wurde gesendet.";
/** The text of `ManualNotificationErrorMessage.NoReceivers` */
const NO_RECEIVERS_TEXT = "Wähle mindestens einen Citizen oder eine Rolle aus.";

const createDialog = (page: Page) => modal(page, "Neue Benachrichtigung");

/** Opens the "Neu" menu of the top bar */
const openCreateMenu = async (page: Page) => {
  const createMenu = page.getByRole("dialog", { name: "Neu erstellen" });
  await clickUntilVisible(
    /** Only the trigger of the menu has an expanded state */
    page.getByRole("button", { name: "Neu", exact: true, expanded: false }),
    createMenu,
  );
  return createMenu;
};

const rowWithTitle = (page: Page, title: string) =>
  page.getByRole("row").filter({ hasText: title });

test("a notification from the create menu goes to a citizen and a role, and lists with its receivers", async ({
  page,
  prisma,
  signIn,
}) => {
  const escort = await createRole(prisma, { name: "Geleitschutz" });
  const sender = await createCitizen(prisma, {
    handle: "absenderin",
    /** The role picker offers only the roles that the sender can see */
    permissionStrings: [
      ...SENDER_PERMISSIONS,
      `otherRole;read;roleId=${escort.id}`,
    ],
  });
  const receiver = await createCitizen(prisma, { handle: "empfaenger" });

  await signIn(sender.user);
  await page.goto(MANUAL_NOTIFICATIONS_PAGE);
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();

  const createMenu = await openCreateMenu(page);
  await createMenu
    .getByRole("button", { name: "Benachrichtigung", exact: true })
    .click();
  const dialog = createDialog(page);
  await expect(dialog).toBeVisible();

  // The citizen picker re-renders while its citizens load, which swallows a
  // fill that lands in that window — so both text fields insist on their value
  await fillUntilValue(
    dialog.getByLabel("Titel", { exact: true }),
    "Treffen am Samstag",
  );
  await fillUntilValue(
    dialog.getByLabel("Text", { exact: true }),
    "Wir treffen uns um 20 Uhr in Port Tressler.",
  );

  await pickFromSearch(
    page,
    dialog.getByRole("combobox", { name: "Citizens" }),
    "empfaenger",
  );
  /** The picked citizen becomes a chip linking to their profile */
  await expect(dialog.getByRole("link", { name: "empfaenger" })).toBeVisible();

  /**
   * The citizen picker has an icon button with the same name, which selects
   * the citizens of a role instead. The role picker's trigger has a text.
   */
  const rolePicker = page.getByRole("dialog", { name: "Rolle auswählen" });
  await clickUntilVisible(
    dialog
      .getByRole("button", { name: "Rolle auswählen" })
      .filter({ hasText: "Rolle auswählen" }),
    rolePicker,
  );
  await rolePicker.getByText("Geleitschutz", { exact: true }).click();
  await expect(dialog.getByTitle("Rolle entfernen")).toHaveText([
    "Geleitschutz",
  ]);
  /** A click outside the role picker closes it and frees the submit button */
  await dialog.getByLabel("Titel", { exact: true }).click();
  await expect(rolePicker).not.toBeVisible();

  await dialog.getByRole("button", { name: "Senden" }).click();

  await expect(page.getByText(SENT_TEXT)).toBeVisible();
  await expect(dialog).not.toBeVisible();

  const notification = await prisma.manualNotification.findFirstOrThrow();
  expect(notification).toMatchObject({
    createdById: sender.entity.id,
    title: "Treffen am Samstag",
    body: "Wir treffen uns um 20 Uhr in Port Tressler.",
  });
  expect(
    await prisma.manualNotificationCitizen.findMany({
      select: { manualNotificationId: true, citizenId: true },
    }),
  ).toEqual([
    { manualNotificationId: notification.id, citizenId: receiver.entity.id },
  ]);
  expect(
    await prisma.manualNotificationRole.findMany({
      select: { manualNotificationId: true, roleId: true },
    }),
  ).toEqual([{ manualNotificationId: notification.id, roleId: escort.id }]);

  // The table lists the new row with its sender and its receivers
  const row = rowWithTitle(page, "Treffen am Samstag");
  await expect(row).toBeVisible();
  await expect(row.getByRole("link", { name: "absenderin" })).toBeVisible();
  await expect(row.getByRole("link", { name: "empfaenger" })).toBeVisible();
  await expect(row.getByText("Geleitschutz", { exact: true })).toBeVisible();
  await expect(row).toContainText(
    "Wir treffen uns um 20 Uhr in Port Tressler.",
  );

  await expectAuditEvents(prisma, ["MANUAL_NOTIFICATION_CREATED"]);
  expect(
    await prisma.auditEvent.findFirstOrThrow({
      where: { type: "MANUAL_NOTIFICATION_CREATED" },
      select: { createdById: true, triggeredViaMcp: true, data: true },
    }),
  ).toEqual({
    createdById: sender.user.id,
    triggeredViaMcp: false,
    data: {
      manualNotificationId: notification.id,
      title: "Treffen am Samstag",
      receiverCitizenIds: [receiver.entity.id],
      receiverRoleIds: [escort.id],
    },
  });
});

test("the form refuses a notification without receivers", async ({
  page,
  prisma,
  signIn,
}) => {
  const sender = await createCitizen(prisma, {
    handle: "absenderin",
    permissionStrings: SENDER_PERMISSIONS,
  });

  await signIn(sender.user);
  await page.goto(MANUAL_NOTIFICATIONS_PAGE);

  /** The create button of the app opens the same modal as the create menu */
  const dialog = createDialog(page);
  await clickUntilVisible(
    page.getByRole("button", { name: "Neue Benachrichtigung" }),
    dialog,
  );

  await fillUntilValue(
    dialog.getByLabel("Titel", { exact: true }),
    "Ohne Empfänger",
  );
  await fillUntilValue(
    dialog.getByLabel("Text", { exact: true }),
    "Diese Benachrichtigung hat keinen Empfänger.",
  );
  await dialog.getByRole("button", { name: "Senden" }).click();

  await expect(dialog.getByRole("alert")).toContainText(NO_RECEIVERS_TEXT);
  await expect(dialog).toBeVisible();
  await expect(page.getByText(SENT_TEXT)).toHaveCount(0);

  expect(await prisma.manualNotification.count()).toBe(0);
  expect(
    await prisma.auditEvent.count({
      where: { type: "MANUAL_NOTIFICATION_CREATED" },
    }),
  ).toBe(0);
});

test("the search filter narrows the list to the matching title or text", async ({
  page,
  prisma,
  signIn,
}) => {
  const sender = await createCitizen(prisma, {
    handle: "absenderin",
    permissionStrings: SENDER_PERMISSIONS,
  });
  const receiver = await createCitizen(prisma, { handle: "empfaenger" });
  const fleet = await createRole(prisma, { name: "Flotte" });

  await prisma.manualNotification.create({
    data: {
      createdById: sender.entity.id,
      createdAt: new Date("2026-10-20T10:00:00Z"),
      title: "Wartung am Montag",
      body: "Das SAM ist am Montag kurz nicht erreichbar.",
      receiverCitizens: { create: { citizenId: receiver.entity.id } },
    },
  });
  await prisma.manualNotification.create({
    data: {
      createdById: sender.entity.id,
      createdAt: new Date("2026-10-21T10:00:00Z"),
      title: "Flottenübung",
      body: "Wir üben den Verbandsflug.",
      receiverRoles: { create: { roleId: fleet.id } },
    },
  });

  await signIn(sender.user);
  await page.goto(MANUAL_NOTIFICATIONS_PAGE);

  const maintenanceRow = rowWithTitle(page, "Wartung am Montag");
  const exerciseRow = rowWithTitle(page, "Flottenübung");
  await expect(maintenanceRow).toBeVisible();
  await expect(exerciseRow).toBeVisible();
  // The newest notification first
  await expect(
    page.getByRole("row").filter({ hasText: /Wartung am Montag|Flottenübung/ }),
  ).toHaveText([/Flottenübung/, /Wartung am Montag/]);
  await expect(
    maintenanceRow.getByRole("link", { name: "empfaenger" }),
  ).toBeVisible();

  // The search filter feeds the nuqs URL contract (?search=…)
  await fillUntilUrl(
    page,
    page.getByLabel("Titel oder Text"),
    "Wartung",
    /search=Wartung/,
  );
  await expect(exerciseRow).toHaveCount(0);
  await expect(maintenanceRow).toBeVisible();

  // The search also matches the text of a notification
  await page.goto(`${MANUAL_NOTIFICATIONS_PAGE}?search=Verbandsflug`);
  await expect(exerciseRow).toBeVisible();
  await expect(maintenanceRow).toHaveCount(0);

  await page.goto(`${MANUAL_NOTIFICATIONS_PAGE}?search=Nichts`);
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
});

test("the create menu offers no notification without manualNotification;manage", async ({
  page,
  prisma,
  signIn,
}) => {
  /** A different create permission, so that the menu exists */
  const keeper = await createCitizen(prisma, {
    handle: "strafpunkt-verwalter",
    permissionStrings: ["penaltyEntry;create"],
  });

  await signIn(keeper.user);
  await page.goto("/app/dashboard");

  const createMenu = await openCreateMenu(page);
  await expect(
    createMenu.getByRole("button", { name: "Strafpunkte", exact: true }),
  ).toBeVisible();
  await expect(
    createMenu.getByRole("button", { name: "Benachrichtigung", exact: true }),
  ).toHaveCount(0);
});

test("the notification center shows a manual notification with its title and text", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "leserin" });
  await createOnSiteNotification(prisma, {
    citizenId: citizen.entity.id,
    notificationType: "manual_notification",
    payload: {
      title: "Treffen am Samstag",
      body: "Wir treffen uns um 20 Uhr in Port Tressler.",
    },
  });
  await signIn(citizen.user);

  await page.goto("/app");
  /**
   * Base UI renders the popover with `role="dialog"`, named after its
   * trigger. The notification center is mounted twice (top bar and mobile
   * flyout), so the assertions are scoped to the open popover.
   */
  const popover = page.getByRole("dialog", { name: "Benachrichtigungen" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Benachrichtigungen" }),
    popover.getByRole("tab", { name: "Posteingang" }),
  );

  await expect(popover.getByText("Treffen am Samstag")).toBeVisible();
  await expect(
    popover.getByText("Wir treffen uns um 20 Uhr in Port Tressler."),
  ).toBeVisible();
  await expect(
    popover.getByText("Manuelle Benachrichtigungen", { exact: true }),
  ).toBeVisible();
});
