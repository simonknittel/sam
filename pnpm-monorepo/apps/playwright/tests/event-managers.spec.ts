import type { Locator, Page } from "@playwright/test";
import { EventActivityType } from "@sam-monorepo/database/client";
import {
  createAppEvent,
  createCitizen,
  futureEvent,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  pickFromSearch,
  SAVED_TEXT,
  sectionByHeading,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The picker resolves its options through the citizen list, so a manager
 * needs `citizen;read` on top of the event permissions.
 */
const MANAGER_PERMISSIONS = ["event;read", "citizen;read"];

/** The tile of the participants tab that lists and edits the managers */
const managerTile = (page: Page) => sectionByHeading(page, "Manager");

const activityRows = (page: Page, message: string) =>
  page.getByRole("row").filter({ hasText: message });

/**
 * The option click and the picker's state commit are not the same tick, so
 * the chip the pick produces is what says the selection landed.
 */
const pickCitizen = async (
  page: Page,
  dialog: Locator,
  combobox: Locator,
  handle: string,
) => {
  await pickFromSearch(page, combobox, handle);
  await expect(dialog.getByRole("link", { name: handle })).toBeVisible();
};

/**
 * Reaches the activity tab the way a manager does after a mutation: a soft
 * navigation, which is served from the client Router Cache unless the action
 * expired it. A `page.goto` would always refetch and so would pass even if
 * the action revalidated the wrong scope.
 */
const openActivityTab = (page: Page, eventId: string) =>
  clickUntilUrl(
    page,
    page.getByRole("link", { name: "Aktivität" }),
    new RegExp(`/app/events/${eventId}/activity$`),
  );

test("adding managers writes one feed entry for each of them", async ({
  page,
  prisma,
  signIn,
}) => {
  const organizer = await createCitizen(prisma, {
    handle: "manager-orga",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const first = await createCitizen(prisma, { handle: "neuer-manager-eins" });
  const second = await createCitizen(prisma, { handle: "neuer-manager-zwei" });
  const event = await createAppEvent(prisma, {
    name: "Operation Managerzuwachs",
    createdById: organizer.entity.id,
    ...futureEvent(),
  });
  /** An entry of a different type, so the type filter has something to drop */
  await prisma.eventActivity.create({
    data: {
      eventId: event.id,
      type: EventActivityType.TITLE_UPDATED,
      citizenId: organizer.entity.id,
      payload: {
        previousName: "Operation Namenlos",
        newName: "Operation Managerzuwachs",
      },
    },
  });

  await signIn(organizer.user);
  await page.goto(`/app/events/${event.id}/participants`);

  const addModal = modal(page, "Manager hinzufügen");
  await clickUntilVisible(
    managerTile(page).getByTitle("Manager hinzufügen"),
    addModal,
  );
  const citizenSearch = addModal.getByRole("combobox", { name: "Citizens" });
  await pickCitizen(page, addModal, citizenSearch, "neuer-manager-eins");
  await pickCitizen(page, addModal, citizenSearch, "neuer-manager-zwei");
  await addModal.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const stored = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    select: { managers: { select: { id: true } } },
  });
  expect(stored.managers.map((manager) => manager.id).toSorted()).toEqual(
    [first.entity.id, second.entity.id].toSorted(),
  );

  /** The acting manager is the actor, the added manager the payload's subject */
  const activities = await prisma.eventActivity.findMany({
    where: { eventId: event.id, type: EventActivityType.MANAGER_ADDED },
  });
  expect(activities).toHaveLength(2);
  for (const activity of activities)
    expect(activity.citizenId).toBe(organizer.entity.id);
  expect(
    activities
      .map((activity) => (activity.payload as { citizenId: string }).citizenId)
      .toSorted(),
  ).toEqual([first.entity.id, second.entity.id].toSorted());

  await openActivityTab(page, event.id);
  const addedRow = activityRows(page, "Manager hinzugefügt").filter({
    hasText: "neuer-manager-eins",
  });
  await expect(addedRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(addedRow).toContainText("manager-orga");
  await expect(activityRows(page, "Manager hinzugefügt")).toHaveCount(2);

  /** The type filter knows the new types and narrows down to them */
  await page.goto(
    `/app/events/${event.id}/activity?type=${EventActivityType.MANAGER_ADDED}`,
  );
  await expect(activityRows(page, "Manager hinzugefügt")).toHaveCount(2);
  await expect(activityRows(page, "Titel von")).toHaveCount(0);

  await page.goto(
    `/app/events/${event.id}/activity?type=${EventActivityType.MANAGER_REMOVED}`,
  );
  await expect(page.getByText("Keine Aktivität für diese Filter.")).toBeVisible(
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
});

test("removing a manager writes a feed entry", async ({
  page,
  prisma,
  signIn,
}) => {
  const organizer = await createCitizen(prisma, {
    handle: "abberufungs-orga",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const manager = await createCitizen(prisma, { handle: "alter-manager" });
  const event = await createAppEvent(prisma, {
    name: "Operation Managerabbau",
    createdById: organizer.entity.id,
    ...futureEvent(),
  });
  await prisma.event.update({
    where: { id: event.id },
    data: { managers: { connect: { id: manager.entity.id } } },
  });
  /** An entry by someone else, so the actor filter has something to drop */
  await prisma.eventActivity.create({
    data: {
      eventId: event.id,
      type: EventActivityType.PARTICIPATION_SIGNED_UP,
      citizenId: manager.entity.id,
      payload: { comment: null },
    },
  });

  await signIn(organizer.user);
  await page.goto(`/app/events/${event.id}/participants`);

  const confirmDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    managerTile(page).getByTitle("Manager entfernen"),
    confirmDialog,
  );
  await confirmDialog.getByRole("button", { name: "Entfernen" }).click();

  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const stored = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    select: { managers: { select: { id: true } } },
  });
  expect(stored.managers).toHaveLength(0);

  const activity = await prisma.eventActivity.findFirstOrThrow({
    where: { eventId: event.id, type: EventActivityType.MANAGER_REMOVED },
  });
  expect(activity.citizenId).toBe(organizer.entity.id);
  expect(activity.payload).toMatchObject({ citizenId: manager.entity.id });

  await openActivityTab(page, event.id);
  const removedRow = activityRows(page, "Manager entfernt");
  await expect(removedRow).toContainText("alter-manager", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(removedRow).toContainText("abberufungs-orga");

  /** The actor of the entry is the acting manager, not the removed one */
  await page.goto(
    `/app/events/${event.id}/activity?actor=${organizer.entity.id}`,
  );
  await expect(activityRows(page, "Manager entfernt")).toHaveCount(1);
  await expect(activityRows(page, "Angemeldet")).toHaveCount(0);

  /** The removed manager only owns the entry they caused themselves */
  await page.goto(
    `/app/events/${event.id}/activity?actor=${manager.entity.id}`,
  );
  await expect(activityRows(page, "Angemeldet")).toHaveCount(1, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(activityRows(page, "Manager entfernt")).toHaveCount(0);
});
