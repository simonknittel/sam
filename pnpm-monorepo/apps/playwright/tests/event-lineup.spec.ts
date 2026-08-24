import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createVariant,
  futureEvent,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  modal,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * ship;read: the lineup page loads the viewer's own fleet for the
 * requirement checks, so without it the whole tab is forbidden.
 */
const LINEUP_PERMISSIONS = ["event;read", "ship;read"];

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
  /** The formatting fields below carry names, the variant picker does not */
  await createDialog
    .locator("select:not([name])")
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
  await clickUntilVisible(
    page.getByTitle("Klicken, um zu bearbeiten"),
    nameInput,
  );
  await nameInput.fill("Chefpilot");
  await page.locator('button[title="Speichern"]').click();
  await expect
    .poll(
      async () =>
        (
          await prisma.eventPosition.findUniqueOrThrow({
            where: { id: pilot.id },
          })
        ).name,
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBe("Chefpilot");

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
  await page.locator("label").filter({ hasText: "Deaktiviert" }).click();

  await expect
    .poll(
      async () =>
        (await prisma.event.findUniqueOrThrow({ where: { id: event.id } }))
          .lineupEnabled,
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBe(true);

  await switchUser(viewer.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByRole("link", { name: "Aufstellung", exact: true }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
});
