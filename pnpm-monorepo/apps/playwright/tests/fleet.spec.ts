import { VariantStatus } from "@sam-monorepo/database/client";
import {
  addCitizenToOrganization,
  createCitizen,
  createVariant,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  clickUntilVisible,
  DELETED_TEXT,
  fillUntilUrl,
  modal,
  SAVED_TEXT,
  saveInlineEditor,
  statisticTile,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("the org fleet filters narrow the server-rendered table", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "flotten-beobachter",
    permissionStrings: ["orgFleet;read", "organizationMembership;read"],
  });
  const owner = await createCitizen(prisma, { handle: "schiffs-besitzer" });
  await addCitizenToOrganization(prisma, owner);

  const polaris = await createVariant(prisma, {
    manufacturerName: "Roberts Space Industries",
    seriesName: "Polaris",
    variantName: "Polaris",
    status: VariantStatus.FLIGHT_READY,
  });
  const carrack = await createVariant(prisma, {
    manufacturerName: "Anvil Aerospace",
    seriesName: "Carrack",
    variantName: "Carrack",
    status: VariantStatus.NOT_FLIGHT_READY,
  });
  await prisma.ship.createMany({
    data: [
      { ownerId: owner.entity.id, variantId: polaris.variant.id },
      { ownerId: owner.entity.id, variantId: polaris.variant.id },
      { ownerId: owner.entity.id, variantId: carrack.variant.id },
    ],
  });

  await signIn(viewer.user);
  await page.goto("/app/fleet/org");

  const polarisRow = page.getByRole("row").filter({ hasText: "Polaris" });
  const carrackRow = page.getByRole("row").filter({ hasText: "Carrack" });
  await expect(polarisRow).toBeVisible();
  await expect(polarisRow).toContainText("2");
  await expect(carrackRow).toBeVisible();
  await expect(carrackRow).toContainText("1");

  // Default sort is count-desc, so Polaris (2 ships) leads
  await expect(page.locator("tbody tr").first()).toContainText("Polaris");

  // The name filter feeds the nuqs URL contract (?q=…)
  await fillUntilUrl(page, page.getByLabel("Name"), "Polaris", /q=Polaris/);
  await expect(carrackRow).not.toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(polarisRow).toBeVisible();

  // The flight-ready flag filter drops the not-flight-ready variant
  await page.goto("/app/fleet/org");
  await expect(carrackRow).toBeVisible();
  await clickUntilUrl(
    page,
    page.locator("label").filter({ hasText: "Flight ready" }),
    /flight_ready=flight_ready/,
  );
  await expect(carrackRow).not.toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(polarisRow).toBeVisible();

  // Sorting by name flips the order
  await page.goto("/app/fleet/org?sort=name-asc");
  await expect(page.locator("tbody tr").first()).toContainText("Carrack");
});

test("my ships can be added, renamed and deleted with consistent org counts", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, {
    handle: "schiffs-besitzer",
    permissionStrings: [
      "ship;manage",
      "orgFleet;read",
      "organizationMembership;read",
    ],
  });
  await addCitizenToOrganization(prisma, owner);
  await createVariant(prisma, {
    manufacturerName: "Roberts Space Industries",
    seriesName: "Polaris",
    variantName: "Polaris",
    status: VariantStatus.FLIGHT_READY,
  });

  await signIn(owner.user);
  await page.goto("/app/fleet/my-ships");
  await expect(page.getByText("Keine Schiffe gefunden")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // Add
  const addModal = modal(page, "Schiff hinzufügen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Hinzufügen" }).first(),
    addModal,
  );
  await addModal.locator("select").selectOption({ label: "Polaris" });
  await addModal.getByLabel("Schiffsname").fill("Sternenfaust");
  await addModal.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(addModal).not.toBeVisible();

  const shipRow = page.getByRole("row").filter({ hasText: "Polaris" });
  await expect(shipRow).toContainText("Sternenfaust");
  await expect(page.getByText("Anzahl: 1")).toBeVisible();

  // The org fleet counts the new ship
  await page.goto("/app/fleet/org");
  await expect(statisticTile(page, "Schiffe")).toContainText("1");
  await expect(statisticTile(page, "Citizen")).toContainText("1");
  await expect(
    page.getByRole("row").filter({ hasText: "Polaris" }),
  ).toContainText("1");

  // Rename
  await page.goto("/app/fleet/my-ships");
  const nameInput = page.locator('input[name="name"]');
  await clickUntilVisible(
    shipRow.locator('button[title="Klicken, um zu bearbeiten"]'),
    nameInput,
  );
  await nameInput.fill("Sternenhammer");
  await saveInlineEditor(page);
  await expect(shipRow).toContainText("Sternenhammer", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const ship = await prisma.ship.findFirst();
  expect(ship?.name).toBe("Sternenhammer");
  expect(ship?.ownerId).toBe(owner.entity.id);

  // Delete (soft) — the list empties and the org count follows
  await clickUntilVisible(
    shipRow.getByTitle("Löschen"),
    page.getByRole("alertdialog"),
  );
  await expect(page.getByText("Schiff löschen?")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Keine Schiffe gefunden")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(async () => (await prisma.ship.findFirst())?.deletedAt)
    .not.toBeNull();

  await page.goto("/app/fleet/org");
  await expect(statisticTile(page, "Schiffe")).toContainText("0");

  // The three writes log the V2 event types, whose ownerId is a citizen id
  const auditEvents = await prisma.auditEvent.findMany({
    where: {
      type: {
        in: ["SHIP_CREATED_V2", "SHIP_UPDATED_V2", "SHIP_DELETED_V2"],
      },
    },
    orderBy: { createdAt: "asc" },
  });
  expect(auditEvents.map((auditEvent) => auditEvent.type)).toEqual([
    "SHIP_CREATED_V2",
    "SHIP_UPDATED_V2",
    "SHIP_DELETED_V2",
  ]);
  for (const auditEvent of auditEvents) {
    // createAuditEvents stores the payload JSON-encoded inside the column
    expect(JSON.parse(auditEvent.data as string)).toMatchObject({
      shipId: ship!.id,
      ownerId: owner.entity.id,
    });
  }
});

test("a variant tag records the creating citizen as its author", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "varianten-manager",
    permissionStrings: ["manufacturersSeriesAndVariants;manage"],
  });
  const { manufacturer, series } = await createVariant(prisma, {
    manufacturerName: "Aegis Dynamics",
    seriesName: "Avenger",
    variantName: "Avenger Titan",
  });

  await signIn(manager.user);
  await page.goto(
    `/app/fleet/settings/manufacturer/${manufacturer.id}/series/${series.id}`,
  );

  const createModal = modal(page, "Variante anlegen");
  await clickUntilVisible(
    page.getByRole("main").getByRole("button", { name: "Anlegen" }),
    createModal,
  );
  await createModal.getByLabel("Name", { exact: true }).fill("Avenger Stalker");

  // The tag rows and the external-link rows share the "Hinzufügen" label
  await clickUntilVisible(
    createModal.getByRole("button", { name: "Hinzufügen" }).first(),
    createModal.getByPlaceholder("Key"),
  );
  await createModal.getByPlaceholder("Key").fill("Class");
  await createModal.getByPlaceholder("Value").fill("Light");

  await createModal.getByRole("button", { name: "Speichern" }).click();
  await expect(createModal).toHaveCount(0);

  await expect
    .poll(async () => prisma.variantTag.findFirst())
    .toMatchObject({
      key: "Class",
      value: "Light",
      createdById: manager.entity.id,
    });
});

test("manufacturers and series can be managed through the REST-backed settings", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "flotten-admin",
    permissionStrings: ["manufacturersSeriesAndVariants;manage"],
  });

  await signIn(admin.user);
  await page.goto("/app/fleet/settings/manufacturer");

  // Create a manufacturer (POST /api/manufacturer)
  const manufacturerModal = modal(page, "Hersteller anlegen");
  // The top bar has its own "Neu" (create menu) — scope to the page content
  await clickUntilVisible(
    page.getByRole("main").getByRole("button", { name: "Neu" }),
    manufacturerModal,
  );
  await manufacturerModal.getByLabel("Name").fill("Aegis Dynamics");
  await manufacturerModal.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich erstellt")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: "Aegis Dynamics" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const manufacturer = await prisma.manufacturer.findFirst();
  expect(manufacturer?.name).toBe("Aegis Dynamics");

  // Rename it through the inline editor (server action)
  await page.getByRole("link", { name: "Aegis Dynamics" }).click();
  await expect(page).toHaveURL(
    `/app/fleet/settings/manufacturer/${manufacturer!.id}`,
  );
  const nameInput = page.locator('input[name="name"]');
  await clickUntilVisible(
    page.locator('button[title="Klicken, um zu bearbeiten"]'),
    nameInput,
  );
  await nameInput.fill("Aegis Dynamics GmbH");
  await saveInlineEditor(page);
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(async () => (await prisma.manufacturer.findFirst())?.name)
    .toBe("Aegis Dynamics GmbH");

  // Create a series under it (POST /api/series)
  const seriesModal = modal(page, "Serie anlegen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Anlegen" }),
    seriesModal,
  );
  await seriesModal.getByLabel("Name", { exact: true }).fill("Avenger");
  const saveSeriesButton = seriesModal.getByRole("button", {
    name: "Speichern",
  });
  await expect(saveSeriesButton).toBeEnabled();
  await saveSeriesButton.click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: "Avenger" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const series = await prisma.series.findFirst();
  expect(series).toMatchObject({
    name: "Avenger",
    manufacturerId: manufacturer!.id,
  });
});
