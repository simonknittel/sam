import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen } from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilVisible,
  FORBIDDEN_TEXT,
  modal,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
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

  await expect(page).toHaveURL(/\/app\/spynet\/organization\/[a-z0-9]+$/);
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

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(page.getByText("Mitglieder (1)")).toBeVisible();
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

  await expect(page.getByText("Erfolgreich entfernt")).toBeVisible();
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();
  await expect
    .poll(() =>
      prisma.activeOrganizationMembership.count({
        where: { organizationId: organization.id },
      }),
    )
    .toBe(0);
  /** LEFT ends the membership in the history only */
  expect(
    await prisma.organizationMembershipHistoryEntry.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
      select: { type: true, confirmed: true },
    }),
  ).toEqual([
    {
      type: OrganizationMembershipType.MAIN,
      confirmed: ConfirmationStatus.CONFIRMED,
    },
    {
      type: OrganizationMembershipType.LEFT,
      confirmed: ConfirmationStatus.CONFIRMED,
    },
  ]);

  await expectAuditEvents(prisma, [
    "ORGANIZATION_CREATED",
    "ORGANIZATION_MEMBERSHIP_CREATED",
    "ORGANIZATION_MEMBERSHIP_REMOVED",
  ]);
});

test("a reported membership becomes active with its confirmation", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  const member = await createCitizen(prisma, { handle: "org-mitglied" });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: admin.entity.id,
      membershipHistoryEntries: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.AFFILIATE,
          visibility: OrganizationMembershipVisibility.PUBLIC,
          createdById: admin.entity.id,
        },
      },
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/organization/${organization.id}`);
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();

  /** A second click would confirm again, thus the page must hydrate first */
  await waitForAppShellHydration(page);
  await page
    .getByRole("row")
    .filter({ hasText: "Unbestätigt" })
    .getByRole("button", { name: "Bestätigen" })
    .click();

  await expect(page.getByText("Mitglieder (1)")).toBeVisible();
  expect(
    await prisma.activeOrganizationMembership.findMany({
      where: { organizationId: organization.id },
      select: { citizenId: true, type: true },
    }),
  ).toEqual([
    {
      citizenId: member.entity.id,
      type: OrganizationMembershipType.AFFILIATE,
    },
  ]);

  await expectAuditEvents(prisma, ["ORGANIZATION_MEMBERSHIP_CONFIRMED"]);
});

test("a second confirmation of a reported membership changes nothing", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  const member = await createCitizen(prisma, { handle: "org-mitglied" });
  const otherCitizen = await createCitizen(prisma, { handle: "org-fremder" });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: admin.entity.id,
    },
  });
  const historyEntry = await prisma.organizationMembershipHistoryEntry.create({
    data: {
      organizationId: organization.id,
      citizenId: member.entity.id,
      type: OrganizationMembershipType.AFFILIATE,
      visibility: OrganizationMembershipVisibility.PUBLIC,
      createdById: admin.entity.id,
    },
  });

  await signIn(admin.user);

  const confirm = (citizenId: string) =>
    page.request.patch(
      `/api/spynet/organization/${organization.id}/membership/${citizenId}/confirm`,
      {
        data: { id: historyEntry.id, confirmed: ConfirmationStatus.CONFIRMED },
      },
    );

  /** The entry must belong to the citizen and the organization of the URL */
  const mismatchedResponse = await confirm(otherCitizen.entity.id);
  expect(mismatchedResponse.status()).toBe(404);

  const responses = await Promise.all([
    confirm(member.entity.id),
    confirm(member.entity.id),
  ]);
  /** One confirmation wins. The other one finds the entry confirmed. */
  expect(responses.map((response) => response.status()).toSorted()).toEqual([
    200, 409,
  ]);

  expect(
    await prisma.activeOrganizationMembership.findMany({
      where: { organizationId: organization.id },
      select: { citizenId: true, type: true },
    }),
  ).toEqual([
    {
      citizenId: member.entity.id,
      type: OrganizationMembershipType.AFFILIATE,
    },
  ]);
  expect(
    await prisma.organizationMembershipHistoryEntry.findUniqueOrThrow({
      where: { id: historyEntry.id },
      select: { confirmed: true, confirmedById: true },
    }),
  ).toEqual({
    confirmed: ConfirmationStatus.CONFIRMED,
    confirmedById: admin.entity.id,
  });
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_CONFIRMED" },
    }),
  ).toBe(1);
});

/**
 * This test pins the current behavior, it does not approve it (known defect
 * 9, kept on purpose): the memberships tile calls `forbidden()`, and the
 * error boundary of the tile lets it through to Next.js. Thus a viewer who
 * can read the organization but not its memberships gets the 403 page for
 * the full organization page, not the error fallback of one tile.
 */
test("without the membership permission the organization page is forbidden, not a failed tile", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "org-betrachter",
    permissionStrings: ["organization;read"],
  });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: viewer.entity.id,
    },
  });

  await signIn(viewer.user);

  const forbidden = page.getByText(FORBIDDEN_TEXT);
  const retryButton = page.getByRole("button", { name: "Erneut versuchen" });

  await page.goto(`/app/spynet/organization/${organization.id}`);
  await expect(forbidden).toBeVisible();
  await expect(retryButton).toHaveCount(0);

  /**
   * The Spynet search leads such a viewer to the page with a client
   * navigation. A marker on `window` survives only a client navigation.
   */
  await page.goto("/app/dashboard");
  const hit = page
    .getByRole("listbox")
    .getByRole("option")
    .filter({ hasText: `Internal ID: ${organization.id}` });
  await fillUntilVisible(
    page.getByRole("combobox", { name: "Spynet durchsuchen" }),
    "Testorganisation",
    hit,
  );
  await page.evaluate(() => {
    Object.assign(window, { clientNavigationMarker: true });
  });
  await hit.click();

  await expect(forbidden).toBeVisible();
  await expect(retryButton).toHaveCount(0);
  await expect(page).toHaveURL(`/app/spynet/organization/${organization.id}`);
  expect(await page.evaluate(() => "clientNavigationMarker" in window)).toBe(
    true,
  );
});
