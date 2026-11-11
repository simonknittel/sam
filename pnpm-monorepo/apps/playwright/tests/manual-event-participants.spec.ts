import type { Locator, Page } from "@playwright/test";
import {
  EventActivityType,
  type PrismaClient,
} from "@sam-monorepo/database/client";
import {
  assignRole,
  createAppEvent,
  createCitizen,
  createEvent,
  createOnSiteNotification,
  createParticipant,
  createRole,
  createRoleTag,
  EventSource,
  EventVisibility,
  futureEvent,
  ONE_MINUTE_MS,
  type TestCitizen,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilValue,
  modal,
  openRolePicker,
  pickFilterOption,
  pickFromSearch,
  pickRoles,
  rolePickerOption,
  rolePickerTag,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The picker resolves its options through the citizen list, so a manager
 * needs `citizen;read` on top of the event permissions.
 */
const MANAGER_PERMISSIONS = ["event;read", "citizen;read"];

const appEvent = (name: string, createdById: string) => ({
  name,
  createdById,
  ...futureEvent(),
});

const pickCitizen = async (dialog: Locator, page: Page, handle: string) => {
  await pickFromSearch(
    page,
    dialog.getByRole("combobox", { name: "Citizens" }),
    handle,
  );
  /** The picked citizen becomes a chip linking to their profile */
  await expect(dialog.getByRole("link", { name: handle })).toBeVisible();
};

enum AddMode {
  Invite = "Einladen",
  Add = "Direkt hinzufügen",
}

/** The dialog opens with an invitation; a direct add needs the other choice */
const openAddModal = async (page: Page, mode = AddMode.Add) => {
  const addModal = modal(page, "Teilnehmer hinzufügen");
  /**
   * The dialog is the click's immediate reaction — the picker inside it is
   * not, since it waits for the addable citizens to come back. Retrying the
   * click on the picker would toggle the dialog shut again under load.
   */
  await clickUntilVisible(page.getByTitle("Teilnehmer hinzufügen"), addModal);
  await expect(
    addModal.getByRole("combobox", { name: "Citizens" }),
  ).toBeVisible();
  await toggleLabel(addModal, mode).click();
  await expect(addModal.getByRole("radio", { name: mode })).toBeChecked();
  return addModal;
};

const removeButtonOf = (page: Page, participant: TestCitizen) =>
  page
    .getByRole("row")
    .filter({ hasText: participant.entity.handle! })
    .getByRole("button", { name: "Entfernen" });

test("a manager adds citizens with a shared comment", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "teilnehmer-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const first = await createCitizen(prisma, {
    handle: "nachzuegler-eins",
    permissionStrings: ["event;read"],
  });
  const second = await createCitizen(prisma, {
    handle: "nachzuegler-zwei",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Nachmeldung", manager.entity.id),
  );

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  const addModal = await openAddModal(page);
  await pickCitizen(addModal, page, "nachzuegler-eins");
  await pickCitizen(addModal, page, "nachzuegler-zwei");
  await fillUntilValue(
    addModal.getByLabel("Kommentar"),
    "Vom Manager nachgetragen",
  );
  await addModal.getByRole("button", { name: "Hinzufügen" }).click();

  await expect(page.getByText("2 Teilnehmer hinzugefügt.")).toBeVisible();
  await expect(page.getByText("Teilnehmer (2)")).toBeVisible();
  await expect(
    page.getByText("Vom Manager nachgetragen").first(),
  ).toBeVisible();

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
  });
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row.source).toBe(EventSource.APP);
    expect(row.comment).toBe("Vom Manager nachgetragen");
    expect(row.cancelledAt).toBeNull();
  }
  expect(rows.map((row) => row.citizenId).toSorted()).toEqual(
    [first.entity.id, second.entity.id].toSorted(),
  );

  /** The manager is the actor, the added citizen the payload's subject */
  const activities = await prisma.eventActivity.findMany({
    where: {
      eventId: event.id,
      type: EventActivityType.PARTICIPATION_ADDED_BY_MANAGER,
    },
  });
  expect(activities).toHaveLength(2);
  for (const activity of activities) {
    expect(activity.citizenId).toBe(manager.entity.id);
    expect(activity.payload).toMatchObject({
      comment: "Vom Manager nachgetragen",
    });
  }

  await page.goto(`/app/events/${event.id}/activity`);
  await expect(page.getByText("Teilnehmer hinzugefügt").first()).toBeVisible();
  const addedRow = page
    .getByRole("row")
    .filter({ hasText: "Teilnehmer hinzugefügt" })
    .filter({ hasText: "nachzuegler-eins" });
  await expect(addedRow).toBeVisible();
  await expect(addedRow).toContainText("teilnehmer-manager");
  await expect(addedRow).toContainText("Vom Manager nachgetragen");
});

test("a manager invites a citizen with a message, and the citizen accepts on the event page with a comment", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "einlade-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const guest = await createCitizen(prisma, {
    handle: "gastpilotin",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Einladung", manager.entity.id),
  );

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  const inviteModal = await openAddModal(page, AddMode.Invite);
  await pickCitizen(inviteModal, page, "gastpilotin");
  await fillUntilValue(
    inviteModal.getByLabel("Nachricht"),
    "Wir brauchen dich als Pilot.",
  );
  await inviteModal
    .getByRole("button", { name: "Einladen", exact: true })
    .click();

  await expect(page.getByText("1 Citizen eingeladen.")).toBeVisible();
  await expect(page.getByText("Teilnehmer (0)")).toBeVisible();
  await expect(
    sectionByHeading(page, "Einladungen (1)")
      .getByRole("row")
      .filter({ hasText: "gastpilotin" }),
  ).toContainText("Offen");

  const invitation = await prisma.eventInvitation.findFirstOrThrow({
    where: { eventId: event.id },
  });
  expect(invitation).toMatchObject({
    citizenId: guest.entity.id,
    createdById: manager.entity.id,
    message: "Wir brauchen dich als Pilot.",
    acceptedAt: null,
    declinedAt: null,
    withdrawnAt: null,
  });

  await switchUser(guest.user);
  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);

  const tile = sectionByHeading(page, "Meine Teilnahme");
  await expect(
    tile.getByText("Eingeladen", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(tile.getByText("Wir brauchen dich als Pilot.")).toBeVisible();
  await fillUntilValue(tile.getByLabel("Kommentar"), "Mit der Gladius.");
  await tile.getByRole("button", { name: "Annehmen" }).click();

  await expect(
    page.getByText("Einladung angenommen. Du bist angemeldet."),
  ).toBeVisible();
  await expect(
    tile.getByText("Zugesagt", { exact: true }).filter({ visible: true }),
  ).toBeVisible();

  const participant = await prisma.eventParticipant.findFirstOrThrow({
    where: { eventId: event.id, citizenId: guest.entity.id },
  });
  expect(participant.comment).toBe("Mit der Gladius.");
  expect(participant.cancelledAt).toBeNull();
  const acceptedInvitation = await prisma.eventInvitation.findUniqueOrThrow({
    where: { id: invitation.id },
  });
  expect(acceptedInvitation.acceptedAt).not.toBeNull();

  await page.goto(`/app/events/${event.id}/activity`);
  const invitedRow = page.getByRole("row").filter({ hasText: "Eingeladen" });
  await expect(invitedRow).toContainText("einlade-manager");
  await expect(invitedRow).toContainText("gastpilotin");
  await expect(invitedRow).toContainText("Wir brauchen dich als Pilot.");
  const acceptedRow = page
    .getByRole("row")
    .filter({ hasText: "Einladung angenommen" });
  await expect(acceptedRow).toContainText("gastpilotin");
  await expect(acceptedRow).toContainText("Mit der Gladius.");
});

test("an invited citizen declines from the notification with a comment, and the manager sees it", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "absage-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const guest = await createCitizen(prisma, {
    handle: "absager",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Absage", manager.entity.id),
  );
  const invitation = await prisma.eventInvitation.create({
    data: {
      eventId: event.id,
      citizenId: guest.entity.id,
      createdById: manager.entity.id,
      message: "Kommst du mit?",
    },
  });
  /** The notification router does not run in the test stack */
  await createOnSiteNotification(prisma, {
    citizenId: guest.entity.id,
    notificationType: "event_invitation_created",
    payload: {
      eventId: event.id,
      eventName: event.name,
      invitationId: invitation.id,
      invitedByHandle: "absage-manager",
      message: "Kommst du mit?",
    },
  });

  await signIn(guest.user);
  await page.goto("/app");

  /** With an unread notification, the inbox opens by itself */
  const row = page
    .getByRole("dialog", { name: "Benachrichtigungen" })
    .getByRole("listitem")
    .filter({ hasText: "Kommst du mit?" });
  await expect(row).toContainText(
    'absage-manager hat dich zum Event "Operation Absage" eingeladen.',
  );
  /** The buttons of the notification open the participation modal */
  const answerModal = modal(page, "Teilnahme - Operation Absage");
  await clickUntilVisible(
    row.getByRole("button", { name: "Ablehnen" }),
    answerModal,
  );
  await expect(answerModal.getByText("Kommst du mit?")).toBeVisible();
  await fillUntilValue(
    answerModal.getByLabel("Kommentar"),
    "Da bin ich im Urlaub.",
  );
  await answerModal.getByRole("button", { name: "Ablehnen" }).click();

  await expect(page.getByText("Einladung abgelehnt.")).toBeVisible();
  await expect(answerModal).toHaveCount(0);
  await expect(row.getByText("Einladung: Abgelehnt")).toBeVisible();

  const declinedInvitation = await prisma.eventInvitation.findUniqueOrThrow({
    where: { id: invitation.id },
  });
  expect(declinedInvitation.declinedAt).not.toBeNull();
  expect(declinedInvitation.declineComment).toBe("Da bin ich im Urlaub.");

  await switchUser(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);
  const invitationRow = page.getByRole("row").filter({ hasText: "absager" });
  await expect(invitationRow).toContainText("Abgelehnt");
  await expect(invitationRow).toContainText("Da bin ich im Urlaub.");
  /** A declined invitation has nothing to withdraw */
  await expect(
    invitationRow.getByRole("button", { name: "Zurückziehen" }),
  ).toHaveCount(0);

  await page.goto(`/app/events/${event.id}/activity`);
  const declinedRow = page
    .getByRole("row")
    .filter({ hasText: "Einladung abgelehnt" });
  await expect(declinedRow).toContainText("absager");
  await expect(declinedRow).toContainText("Da bin ich im Urlaub.");
});

test("the status filter of the invitations shows the open or the declined invitations", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "filter-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const open = await createCitizen(prisma, { handle: "noch-offen" });
  const declined = await createCitizen(prisma, { handle: "schon-abgesagt" });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Filter", manager.entity.id),
  );
  await prisma.eventInvitation.createMany({
    data: [
      { eventId: event.id, citizenId: open.entity.id },
      {
        eventId: event.id,
        citizenId: declined.entity.id,
        declinedAt: new Date(),
        declineComment: "Keine Zeit",
      },
    ],
  });
  /** The first visit of a new event refreshes the page */
  await prisma.readMarker.create({
    data: { citizenId: manager.entity.id, eventId: event.id },
  });
  const invitationRows = sectionByHeading(page, /^Einladungen/).locator(
    "tbody tr",
  );

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);
  await expect(invitationRows).toHaveCount(2);

  const statusFilter = page.getByRole("radiogroup", { name: "Status" });
  await toggleLabel(statusFilter, "Abgelehnt").click();
  await expect(page).toHaveURL(/\?invitation_status=declined$/);
  await expect(invitationRows).toHaveText([/schon-abgesagt/]);
  await expect(page.getByText("Einladungen (1 von 2)")).toBeVisible();

  await toggleLabel(statusFilter, "Offen").click();
  await expect(page).toHaveURL(/\?invitation_status=open$/);
  await expect(invitationRows).toHaveText([/noch-offen/]);
});

test("a manager withdraws an open invitation", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "rueckzieh-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const guest = await createCitizen(prisma, {
    handle: "ausgeladener",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Ausladung", manager.entity.id),
  );
  const invitation = await prisma.eventInvitation.create({
    data: {
      eventId: event.id,
      citizenId: guest.entity.id,
      createdById: manager.entity.id,
    },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  const invitationRow = page
    .getByRole("row")
    .filter({ hasText: "ausgeladener" });
  await expect(invitationRow).toContainText("Offen");
  const confirmDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    invitationRow.getByRole("button", { name: "Zurückziehen" }),
    confirmDialog,
  );
  await confirmDialog.getByRole("button", { name: "Zurückziehen" }).click();

  await expect(page.getByText("Einladung zurückgezogen.")).toBeVisible();
  await expect(page.getByText("Einladungen (1)")).toHaveCount(0);

  const withdrawnInvitation = await prisma.eventInvitation.findUniqueOrThrow({
    where: { id: invitation.id },
  });
  expect(withdrawnInvitation.withdrawnAt).not.toBeNull();
  expect(withdrawnInvitation.withdrawnById).toBe(manager.entity.id);
});

/**
 * A manager with an event, and the citizens of the roles "Pilot",
 * "Ingenieur" and "Händler". The roles "Pilot" and "Ingenieur" have the tag
 * "Crew". The citizen "allrounder" has both roles of the tag, the citizen
 * "zuvor-gewaehlt" has no role, and the citizen "schon-dabei" is a
 * participant.
 */
const seedRoleShortcut = async (prisma: PrismaClient) => {
  const pilotRole = await createRole(prisma, { name: "Pilot" });
  const engineerRole = await createRole(prisma, { name: "Ingenieur" });
  const traderRole = await createRole(prisma, { name: "Händler" });
  await createRoleTag(prisma, {
    name: "Crew",
    roles: [pilotRole, engineerRole],
  });
  const manager = await createCitizen(prisma, {
    handle: "crew-manager",
    permissionStrings: [
      ...MANAGER_PERMISSIONS,
      `otherRole;read;roleId=${pilotRole.id}`,
      `otherRole;read;roleId=${engineerRole.id}`,
      `otherRole;read;roleId=${traderRole.id}`,
    ],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Crew", manager.entity.id),
  );
  /**
   * The first visit of a new event marks it as read and refreshes the page
   * at an unknown time. The refresh can drop the citizen that the test
   * picked before, and then the replacement would not be proven.
   */
  await prisma.readMarker.create({
    data: { citizenId: manager.entity.id, eventId: event.id },
  });

  const citizenWithRoles = async (
    handle: string,
    roles: readonly { readonly id: string }[],
  ) => {
    const citizen = await createCitizen(prisma, {
      handle,
      permissionStrings: ["event;read"],
    });
    for (const role of roles) await assignRole(prisma, citizen.entity, role);
    return citizen;
  };
  const pilot = await citizenWithRoles("pilotin", [pilotRole]);
  await citizenWithRoles("ingenieur", [engineerRole]);
  const allRounder = await citizenWithRoles("allrounder", [
    pilotRole,
    engineerRole,
  ]);
  await citizenWithRoles("haendler", [traderRole]);
  await citizenWithRoles("zuvor-gewaehlt", []);
  /** The picker does not offer a participant */
  const participant = await citizenWithRoles("schon-dabei", [pilotRole]);
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: participant,
    source: EventSource.APP,
  });

  return { manager, event, pilot, allRounder, participant };
};

/**
 * Opens the add dialog, picks the citizen "zuvor-gewaehlt" and opens the role
 * shortcut. The picked citizen must still be there when the popover is open,
 * so that a replacement is a change that the test can see.
 */
const openRoleShortcutAfterPick = async (page: Page) => {
  const addModal = await openAddModal(page);
  await pickCitizen(addModal, page, "zuvor-gewaehlt");

  const popover = await openRolePicker(addModal.getByTitle("Rolle auswählen"));
  await expect(
    addModal.getByRole("link", { name: "zuvor-gewaehlt" }),
  ).toBeVisible();

  return { addModal, popover };
};

test("a tag in the role shortcut of the citizen picker filters the roles, and a role replaces the picked citizens with the citizens of the role", async ({
  page,
  prisma,
  signIn,
}) => {
  const { manager, event, pilot, allRounder, participant } =
    await seedRoleShortcut(prisma);

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  const { addModal, popover } = await openRoleShortcutAfterPick(page);

  /** The tag picks no citizen */
  const crewTag = rolePickerTag(popover, "Crew");
  await crewTag.click();
  await expect(crewTag).toHaveAttribute("aria-pressed", "true");
  await expect(popover.getByRole("option")).toHaveText(["Ingenieur", "Pilot"]);
  await expect(
    addModal.getByRole("link", { name: "zuvor-gewaehlt" }),
  ).toBeVisible();

  await rolePickerOption(popover, "Pilot").click();
  await expect(popover).not.toBeVisible();

  for (const handle of ["pilotin", "allrounder"]) {
    await expect(addModal.getByRole("link", { name: handle })).toHaveCount(1);
  }
  for (const handle of [
    "zuvor-gewaehlt",
    "ingenieur",
    "haendler",
    "schon-dabei",
  ]) {
    await expect(addModal.getByRole("link", { name: handle })).toHaveCount(0);
  }

  await addModal.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(page.getByText("2 Teilnehmer hinzugefügt.")).toBeVisible();
  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    select: { citizenId: true },
  });
  expect(rows.map((row) => row.citizenId).toSorted()).toEqual(
    [participant.entity.id, pilot.entity.id, allRounder.entity.id].toSorted(),
  );
});

test("a manager removes a participant with a reason and clears their lineup", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "abmelde-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const participant = await createCitizen(prisma, {
    handle: "entfernter-teilnehmer",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    ...appEvent("Operation Abmeldung", manager.entity.id),
    lineupEnabled: true,
  });
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: participant,
    source: EventSource.APP,
  });
  const position = await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Sanitäter",
      citizenId: participant.entity.id,
      applications: {
        create: { citizenId: participant.entity.id },
      },
    },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  const confirmDialog = page.getByRole("alertdialog");
  await clickUntilVisible(removeButtonOf(page, participant), confirmDialog);
  await confirmDialog
    .getByLabel("Grund (optional)")
    .fill("Doch nicht dabei gewesen");
  await confirmDialog.getByRole("button", { name: "Entfernen" }).click();

  await expect(page.getByText("Teilnehmer entfernt.")).toBeVisible();
  await expect(page.getByText("Teilnehmer (0)")).toBeVisible();

  const row = await prisma.eventParticipant.findFirstOrThrow({
    where: { eventId: event.id, citizenId: participant.entity.id },
  });
  expect(row.cancelledAt).not.toBeNull();
  expect(row.cancelledById).toBe(manager.entity.id);

  const clearedPosition = await prisma.eventPosition.findUniqueOrThrow({
    where: { id: position.id },
  });
  expect(clearedPosition.citizenId).toBeNull();
  expect(
    await prisma.eventPositionApplication.count({
      where: { positionId: position.id },
    }),
  ).toBe(0);

  const activity = await prisma.eventActivity.findFirstOrThrow({
    where: {
      eventId: event.id,
      type: EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER,
    },
  });
  expect(activity.citizenId).toBe(manager.entity.id);
  expect(activity.payload).toMatchObject({
    citizenId: participant.entity.id,
    reason: "Doch nicht dabei gewesen",
  });

  await page.goto(`/app/events/${event.id}/activity`);
  const removedRow = page
    .getByRole("row")
    .filter({ hasText: "Teilnehmer entfernt" });
  await expect(removedRow).toContainText("entfernter-teilnehmer");
  await expect(removedRow).toContainText("Doch nicht dabei gewesen");
});

test("a removed citizen can sign up again", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiederanmelde-manager",
  });
  const participant = await createCitizen(prisma, {
    handle: "wiederanmelder",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Wiederanmeldung", manager.entity.id),
  );
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: participant,
    source: EventSource.APP,
    cancelled: true,
    cancelledById: manager.entity.id,
  });

  await signIn(participant.user);
  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);

  /** A hidden copy of the streamed participation state can match too */
  await expect(
    page.getByText("Abgemeldet", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText("Du bist angemeldet.")).toBeVisible();

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id, citizenId: participant.entity.id },
  });
  expect(rows).toHaveLength(2);
  expect(rows.filter((row) => row.cancelledAt === null)).toHaveLength(1);
});

/**
 * The unique rule for active sign-ups ignores cancelled rows, but it stops a
 * second active sign-up. A second tab still shows the old state, thus only
 * the database can stop its sign-up.
 */
test("a citizen who cancelled signs up again, but a second tab cannot sign up a second time", async ({
  context,
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "rueckkehr-orga" });
  const participant = await createCitizen(prisma, {
    handle: "rueckkehrer",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Rückkehr", creator.entity.id),
  );
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: participant,
    source: EventSource.APP,
    cancelled: true,
  });

  await signIn(participant.user);
  const [firstTab, secondTab] = [page, await context.newPage()];
  for (const tab of [firstTab, secondTab]) {
    await tab.goto(`/app/events/${event.id}`);
    await waitForAppShellHydration(tab);
    await expect(
      tab.getByText("Abgemeldet", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  }

  await firstTab.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(firstTab.getByText("Du bist angemeldet.")).toBeVisible();

  await secondTab
    .getByRole("button", { name: "Anmelden", exact: true })
    .click();
  await expect(
    secondTab.getByText("Du bist bereits angemeldet."),
  ).toBeVisible();
  /** The refresh of the failed sign-up shows the sign-up of the first tab */
  await expect(
    secondTab.getByText("Zugesagt", { exact: true }).filter({ visible: true }),
  ).toBeVisible();

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id, citizenId: participant.entity.id },
    orderBy: { createdAt: "asc" },
  });
  expect(rows).toHaveLength(2);
  expect(rows[0]!.cancelledAt).not.toBeNull();
  expect(rows[0]!.cancelledById).toBe(participant.entity.id);
  expect(rows[1]!.cancelledAt).toBeNull();
});

test("adding an already signed-up citizen neither duplicates nor fails the batch", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "doppel-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const alreadySignedUp = await createCitizen(prisma, {
    handle: "schon-angemeldet",
    permissionStrings: ["event;read"],
  });
  const newcomer = await createCitizen(prisma, {
    handle: "noch-nicht-angemeldet",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Doppelanmeldung", manager.entity.id),
  );
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: alreadySignedUp,
    source: EventSource.APP,
    comment: "Eigene Anmeldung",
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  /** The picker does not even offer an active participant */
  const addModal = await openAddModal(page);
  const citizenSearch = addModal.getByRole("combobox", { name: "Citizens" });
  /** A citizen it does offer proves the list is loaded and searched */
  await citizenSearch.fill("angemeldet");
  await expect(
    page.getByRole("option", { name: "noch-nicht-angemeldet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "schon-angemeldet" }),
  ).toHaveCount(0);

  await pickCitizen(addModal, page, "noch-nicht-angemeldet");
  await addModal.getByRole("button", { name: "Hinzufügen" }).click();

  await expect(page.getByText("1 Teilnehmer hinzugefügt.")).toBeVisible();
  await expect(page.getByText("Teilnehmer (2)")).toBeVisible();

  /** The existing sign-up keeps its own comment and its single row */
  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id, citizenId: alreadySignedUp.entity.id },
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]!.comment).toBe("Eigene Anmeldung");
});

test("a non-manager gets no participant controls", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "fremd-orga" });
  const viewer = await createCitizen(prisma, {
    handle: "nur-zuschauer",
    permissionStrings: ["event;read", "citizen;read"],
  });
  const participant = await createCitizen(prisma, {
    handle: "fremder-teilnehmer",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Zuschauer", creator.entity.id),
  );
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: participant,
    source: EventSource.APP,
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}/participants`);

  await expect(page.getByText("Teilnehmer (1)")).toBeVisible();
  await expect(page.getByTitle("Teilnehmer hinzufügen")).toHaveCount(0);
  await expect(removeButtonOf(page, participant)).toHaveCount(0);
});

/**
 * The shared where-fragments cannot express the role-level gate, so the
 * offered set is narrowed in memory afterwards. Without that a manager could
 * enroll someone the event 404s for — who then cannot even cancel, because
 * cancelling needs to see the event too.
 */
test("a citizen below their role's max level is not addable to a restricted event", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "stufen-manager",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const leveledRole = await createRole(prisma, {
    name: "stufenrolle",
    permissionStrings: ["event;read"],
  });
  await prisma.role.update({
    where: { id: leveledRole.id },
    data: { maxLevel: 3 },
  });
  const climber = await createCitizen(prisma, { handle: "aufsteiger" });
  const assignment = await assignRole(prisma, climber.entity, leveledRole);

  const event = await createAppEvent(prisma, {
    ...appEvent("Operation Verschlusssache", manager.entity.id),
    visibility: EventVisibility.RESTRICTED,
    visibilityRoleIds: [leveledRole.id],
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  /** Below the max level the role grants nothing, so the event stays hidden */
  const belowMaxModal = await openAddModal(page);
  await belowMaxModal
    .getByRole("combobox", { name: "Citizens" })
    .fill("aufsteiger");
  await expect(page.getByRole("option", { name: /aufsteiger/ })).toHaveCount(0);

  /** Reaching the max level makes the same citizen addable */
  await prisma.roleAssignment.update({
    where: { id: assignment.id },
    data: { currentLevel: 3 },
  });
  await page.reload();

  const atMaxModal = await openAddModal(page);
  await pickCitizen(atMaxModal, page, "aufsteiger");
  await atMaxModal.getByRole("button", { name: "Hinzufügen" }).click();

  await expect(page.getByText("1 Teilnehmer hinzugefügt.")).toBeVisible();
});

test("a Discord event keeps its participant list read-only", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "discord-manager",
    permissionStrings: [...MANAGER_PERMISSIONS, "event;manage"],
  });
  const event = await createEvent(prisma, {
    name: "Operation Discord-Teilnehmer",
    discordCreatorId: "manual-participants-organizer",
    startTime: futureEvent().startTime,
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);

  await expect(page.getByText("Teilnehmer (0)")).toBeVisible();
  await expect(page.getByTitle("Teilnehmer hinzufügen")).toHaveCount(0);
});

test("the participant list sorts by the handle and by the time of the sign-up", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "sortier-orga" });
  const viewer = await createCitizen(prisma, {
    handle: "sortier-zuschauer",
    permissionStrings: ["event;read", "citizen;read"],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Reihenfolge", creator.entity.id),
  );

  /** Zora signs up first, Berta last */
  const now = Date.now();
  for (const [handle, minutesAgo] of [
    ["anton", 2],
    ["berta", 1],
    ["zora", 3],
  ] as const) {
    const citizen = await createCitizen(prisma, { handle });
    const participant = await createParticipant(prisma, {
      eventId: event.id,
      citizen,
      source: EventSource.APP,
    });
    await prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { createdAt: new Date(now - minutesAgo * ONE_MINUTE_MS) },
    });
  }

  /**
   * The first visit of a new event refreshes the page, and a refresh closes
   * the open list of the sort filter
   */
  await prisma.readMarker.create({
    data: { citizenId: viewer.entity.id, eventId: event.id },
  });
  const rows = page.locator("tbody tr").filter({ visible: true });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}/participants`);
  await expect(rows).toHaveText([/anton/, /berta/, /zora/]);
  await expect(page.getByRole("combobox", { name: "Sortierung" })).toHaveValue(
    "Citizen A - Z",
  );

  await pickFilterOption(page, "Sortierung", "Citizen Z - A");
  await expect(page).toHaveURL(/\?sort=citizen-desc$/);
  await expect(rows).toHaveText([/zora/, /berta/, /anton/]);

  await pickFilterOption(page, "Sortierung", "Zugesagt am ↑");
  await expect(page).toHaveURL(/\?sort=joined-at-asc$/);
  await expect(rows).toHaveText([/zora/, /anton/, /berta/]);

  await pickFilterOption(page, "Sortierung", "Zugesagt am ↓");
  await expect(page).toHaveURL(/\?sort=joined-at-desc$/);
  await expect(rows).toHaveText([/berta/, /anton/, /zora/]);

  // The default sort leaves no sort parameter in the URL
  await pickFilterOption(page, "Sortierung", "Citizen A - Z");
  await expect(page).toHaveURL(
    new RegExp(`/app/events/${event.id}/participants$`),
  );
  await expect(rows).toHaveText([/anton/, /berta/, /zora/]);
});

test("the role filter of the participant list shows only the participants with a selected role that the viewer can see", async ({
  page,
  prisma,
  signIn,
}) => {
  const pilotRole = await createRole(prisma, { name: "Pilot" });
  const medicRole = await createRole(prisma, { name: "Sanitäter" });
  const secretRole = await createRole(prisma, { name: "Geheimdienst" });
  const creator = await createCitizen(prisma, { handle: "rollen-orga" });
  const viewer = await createCitizen(prisma, {
    handle: "rollen-zuschauer",
    permissionStrings: [
      "event;read",
      "citizen;read",
      `otherRole;read;roleId=${pilotRole.id}`,
      `otherRole;read;roleId=${medicRole.id}`,
    ],
  });
  const event = await createAppEvent(
    prisma,
    appEvent("Operation Rollenfilter", creator.entity.id),
  );
  for (const [handle, role] of [
    ["pilotin", pilotRole],
    ["sanitaeter", medicRole],
    ["agentin", secretRole],
  ] as const) {
    const citizen = await createCitizen(prisma, { handle });
    await assignRole(prisma, citizen.entity, role);
    await createParticipant(prisma, {
      eventId: event.id,
      citizen,
      source: EventSource.APP,
    });
  }
  /** The first visit of a new event refreshes the page */
  await prisma.readMarker.create({
    data: { citizenId: viewer.entity.id, eventId: event.id },
  });
  const rows = page.locator("tbody tr").filter({ visible: true });
  /** While the page streams, a hidden copy of the texts is outside of it */
  const mainContent = page.locator("#main-content");

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}/participants`);
  await expect(mainContent.getByText("Teilnehmer (3)")).toBeVisible();
  await expect(rows).toHaveCount(3);

  await pickRoles(page.getByRole("button", { name: "Rolle auswählen" }), [
    "Pilot",
    "Sanitäter",
  ]);
  await expect(page).toHaveURL(
    new RegExp(`\\?role=${pilotRole.id},${medicRole.id}$`),
  );
  await expect(rows).toHaveText([/pilotin/, /sanitaeter/]);
  await expect(mainContent.getByText("Teilnehmer (2 von 3)")).toBeVisible();

  /** The URL can name a role that the viewer cannot see */
  await page.goto(`/app/events/${event.id}/participants?role=${secretRole.id}`);
  await expect(
    mainContent.getByText("Keine Teilnehmer für diese Filter."),
  ).toBeVisible();
  await expect(mainContent.getByText("Teilnehmer (0 von 3)")).toBeVisible();
});
