import { ConfirmationStatus } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  modal,
  SAVED_TEXT,
  sectionByHeading,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * Creating an organization also scrapes its logo from the Star Citizen
 * website. The Playwright stack points that base URL at a dead port, so the
 * scrape fails fast and the create carries on without a logo.
 */
const ORGANIZATION_ADMIN_PERMISSIONS = [
  "organization;create",
  "organization;read",
  "organizationMembership;manage",
  "citizen;read",
];

test("an organization is created, staffed and cleared out again", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  const member = await createCitizen(prisma, { handle: "org-mitglied" });

  await signIn(admin.user);
  await page.goto("/app/spynet");

  /**
   * Create
   */
  const createDialog = modal(page, "Neue Organisation");
  await clickUntilVisible(
    page.getByRole("button", { name: "Organisation" }),
    createDialog,
  );
  await createDialog.getByLabel("Spectrum ID").fill("TESTORG");
  await createDialog.getByLabel("Name").fill("Testorganisation");
  await createDialog.getByRole("button", { name: "Anlegen" }).click();

  await expect(page).toHaveURL(/\/app\/spynet\/organization\/[a-z0-9]+$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const organization = await prisma.organization.findFirstOrThrow();
  expect(organization).toMatchObject({
    spectrumId: "TESTORG",
    name: "Testorganisation",
    createdById: admin.entity.id,
  });
  await expect(
    page.getByRole("heading", { name: "Testorganisation" }),
  ).toBeVisible();
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();

  /**
   * A confirmed membership, entered by its internal id
   */
  /** The tile counts its members in its heading, so it is matched loosely */
  const membershipsTile = sectionByHeading(page, /^Mitglieder/);
  const membershipDialog = modal(page, "Citizen hinzufügen");
  await clickUntilVisible(
    membershipsTile.getByRole("button", { name: "Hinzufügen" }),
    membershipDialog,
  );
  await membershipDialog
    .getByLabel("Citizen (Internal ID)")
    .fill(member.entity.id);
  await membershipDialog
    .getByRole("button", { name: "Speichern und bestätigen" })
    .click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Mitglieder (1)")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    page.getByRole("link", { name: "org-mitglied" }).first(),
  ).toBeVisible();

  const membership = await prisma.activeOrganizationMembership.findFirstOrThrow(
    { where: { organizationId: organization.id } },
  );
  expect(membership.citizenId).toBe(member.entity.id);

  const historyEntry =
    await prisma.organizationMembershipHistoryEntry.findFirstOrThrow({
      where: { organizationId: organization.id },
    });
  expect(historyEntry).toMatchObject({
    citizenId: member.entity.id,
    confirmed: ConfirmationStatus.CONFIRMED,
    createdById: admin.entity.id,
  });

  /**
   * Removing the membership keeps the history but empties the tile. This one
   * control still asks through the browser's own confirm dialog.
   */
  page.once("dialog", (dialog) => void dialog.accept());
  await membershipsTile
    .getByRole("button", { name: "Citizen aus der Organisation entfernen" })
    .click();

  await expect(page.getByText("Erfolgreich entfernt")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Keine Mitglieder")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(() =>
      prisma.activeOrganizationMembership.count({
        where: { organizationId: organization.id },
      }),
    )
    .toBe(0);
  expect(
    await prisma.organizationMembershipHistoryEntry.count({
      where: { organizationId: organization.id },
    }),
  ).toBeGreaterThanOrEqual(1);

  await expectAuditEvents(prisma, [
    "ORGANIZATION_CREATED",
    "ORGANIZATION_MEMBERSHIP_CREATED",
    "ORGANIZATION_MEMBERSHIP_REMOVED",
  ]);
});
