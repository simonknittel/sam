import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createParticipant,
  createVariant,
  EventSource,
  futureEvent,
  LINEUP_PERMISSIONS,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  FORBIDDEN_TEXT,
  inlineEditorTrigger,
  modal,
  saveInlineEditor,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const DELETED_CITIZEN_LABEL = "Gelöschter Citizen";

test("a manager builds a lineup: create, rename, require a ship, duplicate, delete", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "posten-leiter",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const { variant } = await createVariant(prisma, {
    manufacturerName: "Aegis Dynamics",
    seriesName: "Retaliator",
    variantName: "Retaliator Bomber",
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Aufstellung",
    createdById: manager.entity.id,
    ...futureEvent(),
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await waitForAppShellHydration(page);

  /**
   * The lineup starts switched off — the organizer publishes it once it is
   * staffed, so managing it has to work before that.
   */
  await expect(page.getByText("Keine Posten vorhanden.")).toBeVisible();

  /**
   * Create a position, with the ship it requires right away
   */
  const createDialog = modal(page, "Posten hinzufügen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Posten hinzufügen" }).first(),
    createDialog,
  );
  await createDialog.getByLabel("Name").fill("Pilot");
  await createDialog
    .getByLabel("Beschreibung (optional)")
    .fill("Fliegt das Schiff.");
  await createDialog
    .getByRole("button", { name: "Hinzufügen", exact: true })
    .click();
  await createDialog
    .getByLabel("Benötigtes Schiff")
    .selectOption({ value: variant.id });
  await createDialog
    .getByRole("button", { name: "Speichern", exact: true })
    .click();

  await expect
    .poll(() => prisma.eventPosition.count({ where: { eventId: event.id } }))
    .toBe(1);

  const pilot = await prisma.eventPosition.findFirstOrThrow({
    where: { eventId: event.id },
    include: { requiredVariants: true },
  });
  expect(pilot).toMatchObject({
    name: "Pilot",
    description: "Fliegt das Schiff.",
  });
  expect(pilot.requiredVariants.map(({ variantId }) => variantId)).toEqual([
    variant.id,
  ]);
  await expect(
    page.getByRole("link", { name: "Retaliator Bomber" }),
  ).toBeVisible();

  /**
   * Rename it through the row's inline editor — the only one on the page
   * while the lineup holds a single position.
   */
  const nameInput = page.locator('input[name="name"]');
  await clickUntilVisible(inlineEditorTrigger(page), nameInput);
  await nameInput.fill("Chefpilot");
  await saveInlineEditor(page);
  await expect
    .poll(() =>
      prisma.eventPosition.findUniqueOrThrow({ where: { id: pilot.id } }),
    )
    .toMatchObject({ name: "Chefpilot" });

  /**
   * A position's actions live behind its accordion, so only an opened one
   * offers them — which keeps every action button unambiguous.
   */
  await clickUntilVisible(
    page.getByTitle("Details öffnen"),
    page.getByRole("button", { name: "Posten duplizieren" }),
  );
  await page.getByRole("button", { name: "Posten duplizieren" }).click();

  await expect
    .poll(() => prisma.eventPosition.count({ where: { eventId: event.id } }))
    .toBe(2);
  const positions = await prisma.eventPosition.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
    include: { requiredVariants: true },
  });
  expect(positions.map((position) => position.name)).toEqual([
    "Chefpilot",
    "Chefpilot",
  ]);
  /** The copy sits right below its source and brings its requirements */
  expect(positions[0]!.id).toBe(pilot.id);
  expect(
    positions[1]!.requiredVariants.map(({ variantId }) => variantId),
  ).toEqual([variant.id]);

  /**
   * Delete the original — its accordion is the open one, so its delete
   * button is the only one rendered.
   */
  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Posten löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect
    .poll(async () => {
      const remaining = await prisma.eventPosition.findMany({
        where: { eventId: event.id },
        select: { id: true },
      });
      return remaining.map(({ id }) => id);
    })
    .toEqual([positions[1]!.id]);

  await expectAuditEvents(prisma, [
    "EVENT_POSITION_CREATED",
    "EVENT_POSITION_NAME_UPDATED",
    "EVENT_POSITION_COPIED",
    "EVENT_POSITION_DELETED",
  ]);
});

test("the lineup toggle publishes the aufstellung to the participants", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "posten-leiter",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const viewer = await createCitizen(prisma, {
    handle: "posten-gast",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Freigabe",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Navigator" },
  });

  /** Without the toggle the tab does not exist for anybody but its managers */
  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Aufstellung", exact: true }),
  ).toHaveCount(0);

  /** The URL is rejected too, but the event around it stays navigable */
  await page.goto(`/app/events/${event.id}/lineup`);
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();

  await switchUser(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await waitForAppShellHydration(page);
  await toggleLabel(page, "Deaktiviert").click();

  await expect
    .poll(() => prisma.event.findUniqueOrThrow({ where: { id: event.id } }))
    .toMatchObject({ lineupEnabled: true });

  await switchUser(viewer.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByRole("link", { name: "Aufstellung", exact: true }),
  ).toBeVisible();
});

test("positions are reordered by dragging and copied into another lineup", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "posten-leiter",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Reihenfolge",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  const target = await createAppEvent(prisma, {
    name: "Operation Ziel",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Erster Posten", order: 0 },
  });
  await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Zweiter Posten", order: 1 },
  });
  const host = await prisma.eventPosition.create({
    data: { eventId: target.id, name: "Gastgeber", order: 0 },
  });

  const lineupOf = async (eventId: string) => {
    const positions = await prisma.eventPosition.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      select: { name: true, parentPositionId: true },
    });
    return positions.map(({ name, parentPositionId }) =>
      parentPositionId ? `${name} (untergeordnet)` : name,
    );
  };

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await waitForAppShellHydration(page);
  await expect(page.getByText("Erster Posten")).toBeVisible();

  /**
   * The lineup drags with the pointer only — its handles start the drag on
   * mousedown, and the drop bands exist only while one is running. The band
   * above a row takes the dragged position in front of it. dragTo() finds
   * the band only after its mousedown.
   */
  await page
    .getByTitle("Posten verschieben")
    .nth(1)
    .dragTo(page.locator('[data-drop-target="before"]').first(), { steps: 10 });

  await expect
    .poll(() => lineupOf(event.id))
    .toEqual(["Zweiter Posten", "Erster Posten"]);
  /**
   * The rows show the order from the server, without a local copy. Thus the
   * new order before the reload shows that the action refreshed the page.
   */
  await expect(inlineEditorTrigger(page)).toHaveText([
    "Zweiter Posten",
    "Erster Posten",
  ]);

  /**
   * Copying puts a position on a clipboard that survives the walk to
   * another event, where every position offers to take it in.
   */
  await page.reload();
  await waitForAppShellHydration(page);
  await clickUntilVisible(
    page.getByTitle("Details öffnen").first(),
    page.getByRole("button", { name: "Posten kopieren" }),
  );
  await page.getByRole("button", { name: "Posten kopieren" }).click();
  await expect(page.getByText("„Zweiter Posten“ kopiert.")).toBeVisible();

  await page.goto(`/app/events/${target.id}/lineup`);
  await waitForAppShellHydration(page);

  const pasteLabel = "„Zweiter Posten“ einfügen";
  await clickUntilVisible(
    page.getByTitle("Details öffnen"),
    page.getByRole("button", { name: pasteLabel }),
  );
  await clickUntilVisible(
    page.getByRole("button", { name: pasteLabel }),
    page.getByRole("button", { name: "In diese Gruppe einfügen" }),
  );
  /** The menu names where the copy came from */
  await expect(
    page.getByText("Aus einem anderen Event kopiert."),
  ).toBeVisible();
  await page.getByRole("button", { name: "In diese Gruppe einfügen" }).click();

  await expect
    .poll(() => lineupOf(target.id))
    .toEqual(["Gastgeber", "Zweiter Posten (untergeordnet)"]);
  const pasted = await prisma.eventPosition.findFirstOrThrow({
    where: { eventId: target.id, parentPositionId: host.id },
  });
  expect(pasted.name).toBe("Zweiter Posten");
  /** The source keeps its own copy — pasting never moves a position */
  expect(await lineupOf(event.id)).toEqual(["Zweiter Posten", "Erster Posten"]);

  await expectAuditEvents(prisma, [
    "EVENT_LINEUP_ORDER_CHANGED",
    "EVENT_POSITION_COPIED",
  ]);
});

/**
 * The ships on one page of the fleet list. The requirement check read only
 * the first page before.
 */
const FLEET_PAGE_SIZE = 100;

test("the requirement check finds a ship after the first page of the fleet, but no deleted ship", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const organizer = await createCitizen(prisma, {
    handle: "posten-leiter",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const applicant = await createCitizen(prisma, {
    handle: "posten-bewerber",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const { variant: otherVariant } = await createVariant(prisma, {
    manufacturerName: "Anvil Aerospace",
    seriesName: "Arrow",
    variantName: "Arrow",
  });
  const { variant: requiredVariant } = await createVariant(prisma, {
    manufacturerName: "Aegis Dynamics",
    seriesName: "Retaliator",
    variantName: "Retaliator Bomber",
  });
  // The fleet list sorts by the variant name, thus the Arrows come first
  await prisma.ship.createMany({
    data: Array.from({ length: FLEET_PAGE_SIZE }, () => ({
      ownerId: applicant.entity.id,
      variantId: otherVariant.id,
    })),
  });
  const requiredShip = await prisma.ship.create({
    data: {
      ownerId: applicant.entity.id,
      variantId: requiredVariant.id,
      deletedAt: new Date(),
    },
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Voraussetzung",
    createdById: organizer.entity.id,
    lineupEnabled: true,
    ...futureEvent(),
  });
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: applicant,
    source: EventSource.APP,
  });
  await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Bomberpilot",
      requiredVariants: {
        create: { variantId: requiredVariant.id, order: 0 },
      },
    },
  });

  const applyButton = page.getByRole("button", { name: "Interesse anmelden" });
  const unmetRequirementHint = page
    .getByText("Du erfüllst nicht die Voraussetzungen für diesen Posten.")
    .first();
  const participantOption = (optionGroupLabel: string) =>
    page
      .getByRole("combobox", { name: "Citizen für Bomberpilot" })
      .locator(`optgroup[label="${optionGroupLabel}"]`)
      .locator("option", { hasText: "posten-bewerber" });

  /**
   * A deleted ship does not meet the requirement. The hint opens on focus,
   * which React renders at once, thus the later check without a hint is
   * sure.
   */
  await signIn(applicant.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await clickUntilVisible(page.getByTitle("Details öffnen"), applyButton);
  await applyButton.focus();
  await expect(unmetRequirementHint).toBeVisible();

  await switchUser(organizer.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await expect(
    participantOption("Alle Teilnehmer - Voraussetzungen nicht erfüllt"),
  ).toHaveCount(1);

  // The ship after the first page of the fleet meets the requirement
  await prisma.ship.update({
    where: { id: requiredShip.id },
    data: { deletedAt: null },
  });

  await page.goto(`/app/events/${event.id}/lineup`);
  await expect(
    participantOption("Alle Teilnehmer - Voraussetzungen erfüllt"),
  ).toHaveCount(1);

  /**
   * The lineup keeps the open positions in the local storage of the
   * browser, which the switch of the user keeps
   */
  await switchUser(applicant.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await expect(applyButton).toBeVisible();
  await applyButton.focus();
  await expect(unmetRequirementHint).toHaveCount(0);
});

test("a deleted participant is not a choice in the position picker", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "posten-leiter",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const activeParticipant = await createCitizen(prisma, {
    handle: "aktiver-teilnehmer",
  });
  const deletedParticipant = await createCitizen(prisma, {
    handle: "geloeschter-teilnehmer",
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Abwesenheit",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  for (const participant of [activeParticipant, deletedParticipant]) {
    await createParticipant(prisma, {
      eventId: event.id,
      citizen: participant,
      source: EventSource.APP,
    });
  }
  await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Pilot",
      order: 0,
      applications: { create: { citizenId: deletedParticipant.entity.id } },
    },
  });
  await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Schütze",
      order: 1,
      citizenId: deletedParticipant.entity.id,
    },
  });
  /** The delete keeps the sign-up, the application and the assignment */
  await prisma.citizen.update({
    where: { id: deletedParticipant.entity.id },
    data: { deletedAt: new Date(), userId: null },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);

  const pilotPicker = page.getByRole("combobox", { name: "Citizen für Pilot" });
  await expect(
    pilotPicker.locator("option", { hasText: "aktiver-teilnehmer" }),
  ).toHaveCount(1);
  await expect(
    pilotPicker.locator("option", { hasText: DELETED_CITIZEN_LABEL }),
  ).toHaveCount(0);
  await expect(
    pilotPicker.locator("option", { hasText: "geloeschter-teilnehmer" }),
  ).toHaveCount(0);

  /**
   * The position keeps its deleted citizen and shows the label, but the
   * manager cannot choose it again
   */
  const gunnerPicker = page.getByRole("combobox", {
    name: "Citizen für Schütze",
  });
  await expect(gunnerPicker).toHaveValue(deletedParticipant.entity.id);
  const deletedOption = gunnerPicker.locator("option", {
    hasText: DELETED_CITIZEN_LABEL,
  });
  await expect(deletedOption).toHaveCount(1);
  await expect(deletedOption).toBeDisabled();
  await expect(
    gunnerPicker.locator("option", { hasText: "geloeschter-teilnehmer" }),
  ).toHaveCount(0);
});

test("a citizen removed from a position is listed as unassigned again", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "posten-leiter",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const pilot = await createCitizen(prisma, { handle: "zugeteilter-pilot" });
  const event = await createAppEvent(prisma, {
    name: "Operation Umbesetzung",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: pilot,
    source: EventSource.APP,
  });
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Pilot", citizenId: pilot.entity.id },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await waitForAppShellHydration(page);

  const picker = page.getByRole("combobox", { name: "Citizen für Pilot" });
  await expect(picker).toHaveValue(pilot.entity.id);
  const unassignedNote = page.getByText("Keinem Posten zugeordnet");
  await expect(unassignedNote).toHaveCount(0);

  await picker.selectOption({ value: "-" });

  /**
   * The select keeps the value of the browser. The list of the participants
   * without a position comes from the server, thus it shows the refresh.
   */
  await expect(unassignedNote).toBeVisible();
  await expect
    .poll(async () => {
      const updatedPosition = await prisma.eventPosition.findUniqueOrThrow({
        where: { id: position.id },
      });
      return updatedPosition.citizenId;
    })
    .toBeNull();
});
