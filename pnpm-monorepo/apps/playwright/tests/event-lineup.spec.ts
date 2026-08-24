import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createVariant,
  futureEvent,
  LINEUP_PERMISSIONS,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  inlineEditorTrigger,
  modal,
  saveInlineEditor,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

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
  await expect(page.getByText("Keine Posten vorhanden.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
    .poll(() => prisma.eventPosition.count({ where: { eventId: event.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
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
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  /**
   * Rename it through the row's inline editor — the only one on the page
   * while the lineup holds a single position.
   */
  const nameInput = page.locator('input[name="name"]');
  await clickUntilVisible(inlineEditorTrigger(page), nameInput);
  await nameInput.fill("Chefpilot");
  await saveInlineEditor(page);
  await expect
    .poll(
      () => prisma.eventPosition.findUniqueOrThrow({ where: { id: pilot.id } }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
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
    .poll(() => prisma.eventPosition.count({ where: { eventId: event.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
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
    .poll(
      async () => {
        const remaining = await prisma.eventPosition.findMany({
          where: { eventId: event.id },
          select: { id: true },
        });
        return remaining.map(({ id }) => id);
      },
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
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
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    page.getByRole("link", { name: "Aufstellung", exact: true }),
  ).toHaveCount(0);

  await switchUser(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);
  await waitForAppShellHydration(page);
  await toggleLabel(page, "Deaktiviert").click();

  await expect
    .poll(() => prisma.event.findUniqueOrThrow({ where: { id: event.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toMatchObject({ lineupEnabled: true });

  await switchUser(viewer.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByRole("link", { name: "Aufstellung", exact: true }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
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
  await expect(page.getByText("Erster Posten")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /**
   * The lineup drags with the pointer only — its handles start the drag on
   * mousedown, and the drop bands exist only while one is running. The band
   * above a row takes the dragged position in front of it.
   */
  const handles = page.getByTitle("Posten verschieben");
  const secondHandle = (await handles.nth(1).boundingBox())!;
  await page.mouse.move(
    secondHandle.x + secondHandle.width / 2,
    secondHandle.y + secondHandle.height / 2,
  );
  await page.mouse.down();

  const dropBefore = page.locator('[data-drop-target="before"]').first();
  await expect(dropBefore).toBeVisible();
  const band = (await dropBefore.boundingBox())!;
  await page.mouse.move(band.x + band.width / 2, band.y + band.height / 2, {
    steps: 10,
  });
  await page.mouse.up();

  await expect
    .poll(() => lineupOf(event.id), { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toEqual(["Zweiter Posten", "Erster Posten"]);
  await expect(page.getByTitle("Posten verschieben").first()).toBeVisible();

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
  await expect(page.getByText("„Zweiter Posten“ kopiert.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
    .poll(() => lineupOf(target.id), { timeout: ACTION_FEEDBACK_TIMEOUT })
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
