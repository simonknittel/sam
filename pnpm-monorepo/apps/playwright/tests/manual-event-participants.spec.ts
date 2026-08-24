import type { Locator, Page } from "@playwright/test";
import { EventActivityType } from "@sam-monorepo/database/client";
import {
  assignRole,
  createAppEvent,
  createCitizen,
  createEvent,
  createParticipant,
  createRole,
  EventSource,
  EventVisibility,
  futureEvent,
  type Citizen,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  modal,
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
  await dialog.getByRole("combobox", { name: "Citizens" }).fill(handle);
  const option = page.getByRole("option", { name: new RegExp(handle) });
  await expect(option).toBeVisible();
  await option.click();
  await expect(dialog.getByRole("link", { name: handle })).toBeVisible();
};

const openAddModal = async (page: Page) => {
  const addModal = modal(page, "Teilnehmer hinzufügen");
  /**
   * The dialog is the click's immediate reaction — the picker inside it is
   * not, since it waits for the addable citizens to come back. Retrying the
   * click on the picker would toggle the dialog shut again under load.
   */
  await clickUntilVisible(page.getByTitle("Teilnehmer hinzufügen"), addModal);
  await expect(
    addModal.getByRole("combobox", { name: "Citizens" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  return addModal;
};

const removeButtonOf = (page: Page, participant: Citizen) =>
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
  /**
   * The comment first: filling it right after picking a citizen can race the
   * selection's re-render under full-suite load, which swallows the fill
   * (same order as the SILC transaction modal).
   */
  await addModal.getByLabel("Kommentar").fill("Vom Manager nachgetragen");
  await pickCitizen(addModal, page, "nachzuegler-eins");
  await pickCitizen(addModal, page, "nachzuegler-zwei");
  await expect(addModal.getByLabel("Kommentar")).toHaveValue(
    "Vom Manager nachgetragen",
  );
  await addModal.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText("2 Teilnehmer hinzugefügt.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Teilnehmer (2)")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Vom Manager nachgetragen").first()).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
  });
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row.source).toBe(EventSource.APP);
    expect(row.citizenId).toBe(row.activeCitizenId);
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

  await expect(page.getByText("Teilnehmer entfernt.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Teilnehmer (0)")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const row = await prisma.eventParticipant.findFirstOrThrow({
    where: { eventId: event.id, citizenId: participant.entity.id },
  });
  expect(row.cancelledAt).not.toBeNull();
  expect(row.cancelledById).toBe(manager.entity.id);
  expect(row.activeCitizenId).toBeNull();
  expect(row.activeDiscordUserId).toBeNull();

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

  await expect(page.getByText("Abgemeldet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText("Du bist angemeldet.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id, citizenId: participant.entity.id },
  });
  expect(rows).toHaveLength(2);
  expect(rows.filter((row) => row.cancelledAt === null)).toHaveLength(1);
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
  await addModal
    .getByRole("combobox", { name: "Citizens" })
    .fill("schon-angemeldet");
  await expect(
    page.getByRole("option", { name: /schon-angemeldet/ }),
  ).toHaveCount(0);

  await pickCitizen(addModal, page, "noch-nicht-angemeldet");
  await addModal.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText("1 Teilnehmer hinzugefügt.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Teilnehmer (2)")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
  await atMaxModal.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText("1 Teilnehmer hinzugefügt.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
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
