import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createVariant,
  ONE_DAY_MS,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("the ship change log lists creations and deletions and filters between them", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "flotten-pruefer",
    permissionStrings: ["otherShips;read"],
  });
  const owner = await createCitizen(prisma, { handle: "schiffs-besitzer" });
  const { variant } = await createVariant(prisma, {
    manufacturerName: "Roberts Space Industries",
    seriesName: "Polaris",
    variantName: "Polaris",
  });

  await prisma.ship.create({
    data: {
      ownerId: owner.entity.id,
      variantId: variant.id,
      name: "Sternenfaust",
      createdAt: new Date(Date.now() - 2 * ONE_DAY_MS),
    },
  });
  await prisma.ship.create({
    data: {
      ownerId: owner.entity.id,
      variantId: variant.id,
      name: "Sternenhammer",
      createdAt: new Date(Date.now() - 2 * ONE_DAY_MS),
      deletedAt: new Date(Date.now() - ONE_DAY_MS),
    },
  });

  await signIn(viewer.user);
  await page.goto("/app/fleet/changes");

  /**
   * A deleted ship shows up as its deletion only — the creation stream
   * lists the ships that are still around.
   */
  const createdRows = page.getByRole("row").filter({ hasText: "Erstellt" });
  const deletedRows = page.getByRole("row").filter({ hasText: "Gelöscht" });
  await expect(createdRows).toHaveCount(1, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(deletedRows).toHaveCount(1);
  await expect(
    page.getByRole("row").filter({ hasText: "Sternenfaust" }),
  ).toContainText("Polaris");

  await page.goto("/app/fleet/changes?changeType=deletion");
  await expect(deletedRows).toHaveCount(1, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(createdRows).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Sternenfaust" }),
  ).toHaveCount(0);

  await page.goto("/app/fleet/changes?changeType=creation");
  await expect(createdRows).toHaveCount(1, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(deletedRows).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Sternenfaust" }),
  ).toBeVisible();
});

test("a variant, its series and its manufacturer are deleted through the settings", async ({
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

  /**
   * Every level hides its delete behind the row's action menu, and asks
   * again in a dialog of its own.
   */
  const deleteThroughRowActions = async (
    rowText: string,
    dialogTitle: string,
  ) => {
    const deleteButton = page.getByRole("button", {
      name: "Löschen",
      exact: true,
    });
    await clickUntilVisible(
      page
        .getByRole("row")
        .filter({ hasText: rowText })
        .getByRole("button", { name: "Aktionen" }),
      deleteButton,
    );
    const dialog = page.getByRole("alertdialog");
    await clickUntilVisible(deleteButton, dialog);
    await expect(dialog.getByText(dialogTitle)).toBeVisible();
    await dialog.getByRole("button", { name: "Löschen" }).click();
  };

  await page.goto(
    `/app/fleet/settings/manufacturer/${manufacturer.id}/series/${series.id}`,
  );
  await deleteThroughRowActions(variant.name, "Variante löschen?");
  await expect
    .poll(() => prisma.variant.count({ where: { id: variant.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toBe(0);

  await page.goto(`/app/fleet/settings/manufacturer/${manufacturer.id}`);
  await deleteThroughRowActions(series.name, "Serie löschen?");
  await expect
    .poll(() => prisma.series.count({ where: { id: series.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toBe(0);

  await page.goto("/app/fleet/settings/manufacturer");
  await deleteThroughRowActions(manufacturer.name, "Hersteller löschen?");
  await expect
    .poll(() => prisma.manufacturer.count({ where: { id: manufacturer.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toBe(0);

  await expectAuditEvents(prisma, [
    "VARIANT_DELETED",
    "SERIES_DELETED",
    "MANUFACTURER_DELETED",
  ]);
});
