import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, ONE_DAY_MS } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  pickFromSearch,
  SAVED_TEXT,
  sectionByHeading,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The citizen picker of the create form loads the roster through tRPC. */
const KEEPER_PERMISSIONS = [
  "penaltyEntry;read",
  "penaltyEntry;create",
  "penaltyEntry;delete",
  "citizen;read",
];

test("an entry is booked on a citizen, shows on their tab and is deleted again", async ({
  page,
  prisma,
  signIn,
}) => {
  const keeper = await createCitizen(prisma, {
    handle: "strafpunkt-verwalter",
    permissionStrings: KEEPER_PERMISSIONS,
  });
  const offender = await createCitizen(prisma, { handle: "delinquent" });

  await signIn(keeper.user);
  await page.goto("/app/penalty-points");
  await expect(page.getByText("Keine Strafpunkte gefunden.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /**
   * Create
   */
  const createDialog = modal(page, "Neue Strafpunkte");
  await clickUntilVisible(
    page.getByRole("button", { name: "Neue Strafpunkte" }),
    createDialog,
  );

  await pickFromSearch(
    page,
    createDialog.getByRole("combobox", { name: "Citizen" }),
    "delinquent",
  );

  await createDialog.getByLabel("Strafpunkte").fill("3");
  await createDialog.getByLabel("Begründung").fill("Beschuss eines Members");
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const entry = await prisma.penaltyEntry.findFirstOrThrow();
  expect(entry).toMatchObject({
    citizenId: offender.entity.id,
    createdById: keeper.entity.id,
    points: 3,
    reason: "Beschuss eines Members",
    deletedAt: null,
  });

  const entryRow = page.getByRole("row").filter({ hasText: "delinquent" });
  await expect(entryRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(entryRow).toContainText("Beschuss eines Members");
  await expect(
    entryRow.getByRole("cell", { name: "3", exact: true }),
  ).toBeVisible();

  /**
   * The citizen's own tab lists it without repeating their name
   */
  await page.goto(`/app/spynet/citizen/${offender.entity.id}/penalty-points`);
  const citizenTile = sectionByHeading(page, "Strafpunkte");
  await expect(citizenTile).toContainText("Beschuss eines Members", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    citizenTile.getByRole("columnheader", { name: "Citizen" }),
  ).toHaveCount(0);

  /**
   * Delete — the entry only leaves the active list, it stays in the deleted one
   */
  await page.goto("/app/penalty-points");
  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    entryRow.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await expect(page.getByText("Strafpunkte löschen?")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(async () => {
      const deleted = await prisma.penaltyEntry.findUniqueOrThrow({
        where: { id: entry.id },
        select: { deletedAt: true, deletedById: true },
      });
      return {
        deleted: deleted.deletedAt !== null,
        deletedById: deleted.deletedById,
      };
    })
    .toEqual({ deleted: true, deletedById: keeper.entity.id });

  await expect(page.getByText("Keine Strafpunkte gefunden.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/penalty-points?status=deleted");
  await expect(
    page.getByRole("row").filter({ hasText: "delinquent" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  await expectAuditEvents(prisma, [
    "PENALTY_ENTRY_CREATED",
    "PENALTY_ENTRY_DELETED",
  ]);
});

test("the status filter separates the active entries from the expired ones", async ({
  page,
  prisma,
  signIn,
}) => {
  const keeper = await createCitizen(prisma, {
    handle: "strafpunkt-verwalter",
    permissionStrings: KEEPER_PERMISSIONS,
  });
  const offender = await createCitizen(prisma, { handle: "delinquent" });

  await prisma.penaltyEntry.createMany({
    data: [
      {
        citizenId: offender.entity.id,
        createdById: keeper.entity.id,
        points: 1,
        reason: "Noch offen",
        expiresAt: new Date(Date.now() + ONE_DAY_MS),
      },
      {
        citizenId: offender.entity.id,
        createdById: keeper.entity.id,
        points: 2,
        reason: "Schon verfallen",
        expiresAt: new Date(Date.now() - ONE_DAY_MS),
      },
    ],
  });

  await signIn(keeper.user);
  await page.goto("/app/penalty-points");

  const openRow = page.getByRole("row").filter({ hasText: "Noch offen" });
  const expiredRow = page
    .getByRole("row")
    .filter({ hasText: "Schon verfallen" });
  await expect(openRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(expiredRow).toHaveCount(0);

  await page.getByText("Inaktiv", { exact: true }).click();
  await expect(expiredRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(openRow).toHaveCount(0);
});
