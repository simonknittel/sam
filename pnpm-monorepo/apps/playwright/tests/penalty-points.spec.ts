import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, ONE_DAY_MS } from "../fixtures/factories";
import {
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  pickFromSearch,
  SAVED_TEXT,
  sectionByHeading,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const DELETED_CITIZEN_LABEL = "Gelöschter Citizen";

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
  await expect(page.getByText("Keine Strafpunkte gefunden.")).toBeVisible();

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

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  const entry = await prisma.penaltyEntry.findFirstOrThrow();
  expect(entry).toMatchObject({
    citizenId: offender.entity.id,
    createdById: keeper.entity.id,
    points: 3,
    reason: "Beschuss eines Members",
    expiresAt: null,
    deletedAt: null,
  });

  const entryRow = page.getByRole("row").filter({ hasText: "delinquent" });
  await expect(entryRow).toBeVisible();
  await expect(entryRow).toContainText("Beschuss eines Members");
  await expect(
    entryRow.getByRole("cell", { name: "3", exact: true }),
  ).toBeVisible();
  /** An entry without an expiry time does not expire */
  await expect(
    entryRow.getByRole("cell", { name: "-", exact: true }),
  ).toBeVisible();

  /**
   * The citizen's own tab lists it without repeating their name
   */
  await page.goto(`/app/spynet/citizen/${offender.entity.id}/penalty-points`);
  const citizenTile = sectionByHeading(page, "Strafpunkte");
  await expect(citizenTile).toContainText("Beschuss eines Members");
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
  await expect(page.getByText(DELETED_TEXT)).toBeVisible();

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

  await expect(page.getByText("Keine Strafpunkte gefunden.")).toBeVisible();

  await page.goto("/app/penalty-points?status=deleted");
  await expect(
    page.getByRole("row").filter({ hasText: "delinquent" }),
  ).toBeVisible();

  await expectAuditEvents(prisma, [
    "PENALTY_ENTRY_CREATED",
    "PENALTY_ENTRY_DELETED",
  ]);
});

test.describe("in a browser outside the time zone of the organization", () => {
  /**
   * The app reads and shows each wall time in the time zone of the
   * organization (Europe/Berlin). A browser in a different zone makes sure
   * that no code reads a wall time in the zone of the browser.
   */
  test.use({ timezoneId: "America/Los_Angeles" });

  test("the expiry time of an entry keeps the entered wall time", async ({
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
    await createDialog.getByLabel("Strafpunkte").fill("1");
    /**
     * Summer time: Berlin is two hours ahead of UTC. The year is far in the
     * future, thus the entry does not expire and stays in the active list.
     */
    await createDialog.getByLabel("Verfällt am").fill("2099-07-15T08:15");
    await createDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText(SAVED_TEXT)).toBeVisible();

    const entry = await prisma.penaltyEntry.findFirstOrThrow({
      select: { expiresAt: true },
    });
    expect(entry.expiresAt?.toISOString()).toBe("2099-07-15T06:15:00.000Z");

    const entryRow = page.getByRole("row").filter({ hasText: "delinquent" });
    await expect(
      entryRow.getByRole("cell", { name: "15.07.2099, 08:15", exact: true }),
    ).toBeVisible();

    await page.goto(`/app/spynet/citizen/${offender.entity.id}/penalty-points`);
    await expect(sectionByHeading(page, "Strafpunkte")).toContainText(
      "15.07.2099, 08:15",
    );
  });
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
  await expect(openRow).toBeVisible();
  await expect(expiredRow).toHaveCount(0);

  await page.getByText("Inaktiv", { exact: true }).click();
  await expect(expiredRow).toBeVisible();
  await expect(openRow).toHaveCount(0);
});

test("an entry names a deleted author as deleted, without a link", async ({
  page,
  prisma,
  signIn,
}) => {
  const keeper = await createCitizen(prisma, {
    handle: "strafpunkt-verwalter",
    permissionStrings: KEEPER_PERMISSIONS,
  });
  const author = await createCitizen(prisma, { handle: "ehemaliger" });
  const offender = await createCitizen(prisma, { handle: "delinquent" });

  await prisma.penaltyEntry.create({
    data: {
      citizenId: offender.entity.id,
      createdById: author.entity.id,
      points: 1,
      reason: "Autor gelöscht",
    },
  });
  /** The Spynet delete is a soft delete, which also removes the login */
  await prisma.citizen.update({
    where: { id: author.entity.id },
    data: { deletedAt: new Date(), userId: null },
  });

  await signIn(keeper.user);
  await page.goto("/app/penalty-points");

  const row = page.getByRole("row").filter({ hasText: "Autor gelöscht" });
  await expect(row).toBeVisible();
  /** The penalized citizen is active, thus a link */
  await expect(row.getByRole("link", { name: "delinquent" })).toBeVisible();
  await expect(row.getByText(DELETED_CITIZEN_LABEL)).toBeVisible();
  await expect(
    row.getByRole("link", { name: DELETED_CITIZEN_LABEL }),
  ).toHaveCount(0);
  await expect(row.getByText("ehemaliger")).toHaveCount(0);
});
