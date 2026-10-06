import type { Page } from "@playwright/test";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  type PrismaClient,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { countLockWaits, startParallelChange } from "../fixtures/database";
import { createCitizen } from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilVisible,
  FORBIDDEN_TEXT,
  modal,
  NOT_FOUND_TEXT,
  RESOURCE_NOT_FOUND_TEXT,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
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

const REMOVED_TEXT = "Erfolgreich entfernt";
const ALREADY_CONFIRMED_TEXT = "Der Eintrag wurde bereits bestätigt.";

/** The tile counts its members in its heading, so it is matched loosely */
const membershipsTile = (page: Page) => sectionByHeading(page, /^Mitglieder/);

const removeMembership = async (page: Page) => {
  const dialog = page.getByRole("alertdialog", {
    name: "Citizen aus der Organisation entfernen?",
  });
  await clickUntilVisible(
    membershipsTile(page).getByRole("button", {
      name: "Citizen aus der Organisation entfernen",
    }),
    dialog,
  );
  await dialog.getByRole("button", { name: "Entfernen" }).click();
};

/**
 * The IDs of the transactions that wrote the active membership rows of the
 * citizen. The replay of the memberships writes all rows of the citizen
 * again, also when they do not change. Thus a changed ID shows a write.
 */
const getActiveMembershipWriters = (prisma: PrismaClient, citizenId: string) =>
  prisma.$queryRaw<{ writer: string }[]>`
    SELECT xmin::text AS writer FROM "ActiveOrganizationMembership"
    WHERE "citizenId" = ${citizenId}
    ORDER BY "organizationId"
  `;

/** The ID of the transaction that wrote the history entry last */
const getHistoryEntryWriters = (prisma: PrismaClient, historyEntryId: string) =>
  prisma.$queryRaw<{ writer: string }[]>`
    SELECT xmin::text AS writer FROM "OrganizationMembershipHistoryEntry"
    WHERE "id" = ${historyEntryId}
  `;

/** The decision buttons of the entry that waits for its confirmation */
const unconfirmedRow = (page: Page, handle: string) =>
  page.getByRole("row").filter({ hasText: "Unbestätigt" }).filter({
    hasText: handle,
  });

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
  await expect(createDialog).toHaveCount(0);
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
  const membershipDialog = modal(page, "Citizen hinzufügen");
  await clickUntilVisible(
    membershipsTile(page).getByRole("button", { name: "Hinzufügen" }),
    membershipDialog,
  );
  await membershipDialog
    .getByLabel("Citizen (Internal ID)")
    .fill(member.entity.id);
  await membershipDialog
    .getByRole("button", { name: "Speichern und bestätigen" })
    .click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(membershipDialog).toHaveCount(0);
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
   * Removing the membership keeps the history but empties the tile
   */
  await removeMembership(page);

  await expect(page.getByText(REMOVED_TEXT)).toBeVisible();
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();
  expect(
    await prisma.activeOrganizationMembership.count({
      where: { organizationId: organization.id },
    }),
  ).toBe(0);
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

test("an organization with a known Spectrum ID is not created again", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: admin.entity.id,
    },
  });

  await signIn(admin.user);
  await page.goto("/app/spynet");

  const createDialog = modal(page, "Neue Organisation");
  await clickUntilVisible(
    page.getByRole("button", { name: "Organisation" }),
    createDialog,
  );
  await createDialog.getByLabel("Spectrum ID").fill("TESTORG");
  await createDialog.getByLabel("Name").fill("Zweite Organisation");
  await createDialog.getByRole("button", { name: "Anlegen" }).click();

  /** The modal stays open with the error and the entered values */
  await expect(
    createDialog.getByText(
      "Eine Organisation mit dieser Spectrum ID existiert bereits.",
    ),
  ).toBeVisible();
  await expect(createDialog.getByLabel("Spectrum ID")).toHaveValue("TESTORG");
  await expect(createDialog.getByLabel("Name")).toHaveValue(
    "Zweite Organisation",
  );
  await expect(page).toHaveURL("/app/spynet");

  expect(await prisma.organization.count()).toBe(1);
  expect(
    await prisma.auditEvent.count({ where: { type: "ORGANIZATION_CREATED" } }),
  ).toBe(0);
});

test("a membership reported on the page of a citizen waits for its confirmation", async ({
  page,
  prisma,
  signIn,
}) => {
  /** Without the permission to confirm, a report stays unconfirmed */
  const reporter = await createCitizen(prisma, {
    handle: "spynet-melder",
    permissionStrings: [
      "citizen;read",
      "organizationMembership;create",
      "organizationMembership;read",
    ],
  });
  const member = await createCitizen(prisma, { handle: "org-mitglied" });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: reporter.entity.id,
    },
  });

  await signIn(reporter.user);
  await page.goto(`/app/spynet/citizen/${member.entity.id}/organizations`);
  /** While the page streams, React keeps a hidden copy of the tile */
  const noOrganizations = page
    .getByText("Keine Organisationen")
    .filter({ visible: true });
  await expect(noOrganizations).toBeVisible();

  const dialog = modal(page, "Organisation hinzufügen");
  await clickUntilVisible(
    sectionByHeading(page, "Aktuell").getByRole("button", {
      name: "Hinzufügen",
    }),
    dialog,
  );
  await expect(
    dialog.getByRole("button", { name: "Speichern und bestätigen" }),
  ).toHaveCount(0);

  /**
   * An unknown organization: the modal stays open and keeps the values
   */
  const organizationInput = dialog.getByLabel("Organisation (Internal ID)");
  const unknownOrganizationId = `c${"0".repeat(24)}`;
  await organizationInput.fill(unknownOrganizationId);
  await dialog.getByLabel("Typ").selectOption("Affiliate");
  await toggleLabel(dialog, "Redacted").click();
  await expect(dialog.getByLabel("Redacted")).toBeChecked();
  await dialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(organizationInput).toHaveValue(unknownOrganizationId);
  await expect(dialog.getByLabel("Typ")).toHaveValue(
    OrganizationMembershipType.AFFILIATE,
  );
  await expect(dialog.getByLabel("Redacted")).toBeChecked();

  /**
   * The correct organization
   */
  await organizationInput.fill(organization.id);
  await dialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(
    await prisma.organizationMembershipHistoryEntry.findMany({
      select: {
        organizationId: true,
        citizenId: true,
        type: true,
        visibility: true,
        confirmed: true,
        createdById: true,
      },
    }),
  ).toEqual([
    {
      organizationId: organization.id,
      citizenId: member.entity.id,
      type: OrganizationMembershipType.AFFILIATE,
      visibility: OrganizationMembershipVisibility.REDACTED,
      confirmed: null,
      createdById: reporter.entity.id,
    },
  ]);
  expect(await prisma.activeOrganizationMembership.count()).toBe(0);
  await expect(noOrganizations).toBeVisible();
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_CREATED" },
    }),
  ).toBe(1);
});

test("a confirmed report becomes an active membership, a false report does not", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  const member = await createCitizen(prisma, { handle: "org-mitglied" });
  const rumoredMember = await createCitizen(prisma, {
    handle: "org-geruecht",
  });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: admin.entity.id,
      membershipHistoryEntries: {
        create: [member, rumoredMember].map((citizen) => ({
          citizenId: citizen.entity.id,
          type: OrganizationMembershipType.AFFILIATE,
          visibility: OrganizationMembershipVisibility.PUBLIC,
          createdById: admin.entity.id,
        })),
      },
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/organization/${organization.id}`);
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();

  /** A second click would confirm again, thus the page must hydrate first */
  await waitForAppShellHydration(page);
  await unconfirmedRow(page, "org-mitglied")
    .getByRole("button", { name: "Bestätigen" })
    .click();

  await expect(page.getByText("Mitglieder (1)")).toBeVisible();
  await expect(unconfirmedRow(page, "org-mitglied")).toHaveCount(0);

  await unconfirmedRow(page, "org-geruecht")
    .getByRole("button", { name: "Falschmeldung" })
    .click();

  await expect(unconfirmedRow(page, "org-geruecht")).toHaveCount(0);
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "org-geruecht" })
      .filter({ hasText: "Falschmeldung" }),
  ).toBeVisible();
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
  expect(
    await prisma.organizationMembershipHistoryEntry.findFirstOrThrow({
      where: { citizenId: rumoredMember.entity.id },
      select: { confirmed: true, confirmedById: true },
    }),
  ).toEqual({
    confirmed: ConfirmationStatus.FALSE_REPORT,
    confirmedById: admin.entity.id,
  });
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_CONFIRMED" },
    }),
  ).toBe(2);
});

test("two confirmations of a reported membership at the same time: one wins, the other gets a conflict", async ({
  browser,
  context,
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

  /**
   * One client sends its server actions one after the other. Thus the race
   * needs a second browser context, with the same session.
   */
  const secondContext = await browser.newContext();
  try {
    await secondContext.addCookies(await context.cookies());
    const pages = [page, await secondContext.newPage()];

    for (const currentPage of pages) {
      await currentPage.goto(`/app/spynet/organization/${organization.id}`);
      await expect(currentPage.getByText("Keine Mitglieder")).toBeVisible();
      await waitForAppShellHydration(currentPage);
    }

    /**
     * The test holds the lock of the citizen that the actions take, until
     * both confirmations wait for it. Thus the two confirmations run at the
     * same time, and only the lock sets their order.
     */
    const citizenLock = await startParallelChange(
      prisma,
      (transaction) => transaction.$queryRaw`
        SELECT 1 FROM "Citizen" WHERE "id" = ${member.entity.id}
        FOR NO KEY UPDATE
      `,
    );
    try {
      await Promise.all(
        pages.map((currentPage) =>
          unconfirmedRow(currentPage, "org-mitglied")
            .getByRole("button", { name: "Bestätigen" })
            .click(),
        ),
      );
      /**
       * The second confirmation waits for the first one, not for the lock of
       * the test. Thus count all waits.
       */
      await expect.poll(() => countLockWaits(prisma)).toBe(2);
    } finally {
      await citizenLock.commit();
    }

    const feedbacks = await Promise.all(
      pages.map(async (currentPage) => {
        const feedback = currentPage
          .getByText(SAVED_TEXT)
          .or(currentPage.getByText(ALREADY_CONFIRMED_TEXT));
        await expect(feedback).toBeVisible();
        const feedbackText = await feedback.innerText();

        /** The conflict also refreshes the page */
        await expect(currentPage.getByText("Mitglieder (1)")).toBeVisible();

        return feedbackText;
      }),
    );
    /** One confirmation wins. The other one finds the entry confirmed. */
    expect(feedbacks.toSorted()).toEqual(
      [SAVED_TEXT, ALREADY_CONFIRMED_TEXT].toSorted(),
    );
  } finally {
    await secondContext.close();
  }

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
  /** The winning transaction wrote both rows. The conflict wrote nothing. */
  expect(await getActiveMembershipWriters(prisma, member.entity.id)).toEqual(
    await getHistoryEntryWriters(prisma, historyEntry.id),
  );
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_CONFIRMED" },
    }),
  ).toBe(1);
});

test("a confirmation with the ID of a different citizen changes nothing", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  const member = await createCitizen(prisma, { handle: "org-mitglied" });
  /** An active membership, thus a write of a replay is visible */
  const otherMember = await createCitizen(prisma, {
    handle: "org-anderes-mitglied",
  });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: admin.entity.id,
      membershipHistoryEntries: {
        create: [
          {
            citizenId: member.entity.id,
            type: OrganizationMembershipType.AFFILIATE,
            visibility: OrganizationMembershipVisibility.PUBLIC,
            createdById: admin.entity.id,
          },
          {
            citizenId: otherMember.entity.id,
            type: OrganizationMembershipType.MAIN,
            visibility: OrganizationMembershipVisibility.PUBLIC,
            createdById: admin.entity.id,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: new Date(),
            confirmedById: admin.entity.id,
          },
        ],
      },
      activeMemberships: {
        create: {
          citizenId: otherMember.entity.id,
          type: OrganizationMembershipType.MAIN,
          visibility: OrganizationMembershipVisibility.PUBLIC,
        },
      },
    },
  });
  const historyEntry =
    await prisma.organizationMembershipHistoryEntry.findFirstOrThrow({
      where: { citizenId: member.entity.id },
    });

  await signIn(admin.user);
  await page.goto(`/app/spynet/organization/${organization.id}`);
  await expect(page.getByText("Mitglieder (1)")).toBeVisible();
  await waitForAppShellHydration(page);

  const entryWritersBefore = await getHistoryEntryWriters(
    prisma,
    historyEntry.id,
  );
  const membershipWritersBefore = await getActiveMembershipWriters(
    prisma,
    otherMember.entity.id,
  );

  /** A crafted request: the entry of one citizen, the ID of a different one */
  const row = unconfirmedRow(page, "org-mitglied");
  await row
    .locator('input[name="citizenId"]')
    .evaluate((input: HTMLInputElement, citizenId) => {
      input.value = citizenId;
    }, otherMember.entity.id);
  await row.getByRole("button", { name: "Bestätigen" }).click();

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(unconfirmedRow(page, "org-mitglied")).toBeVisible();
  expect(await getHistoryEntryWriters(prisma, historyEntry.id)).toEqual(
    entryWritersBefore,
  );
  expect(
    await getActiveMembershipWriters(prisma, otherMember.entity.id),
  ).toEqual(membershipWritersBefore);
  expect(await prisma.activeOrganizationMembership.count()).toBe(1);
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_CONFIRMED" },
    }),
  ).toBe(0);
});

test("a membership that a different tab removed before is not removed again", async ({
  context,
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
          type: OrganizationMembershipType.MAIN,
          visibility: OrganizationMembershipVisibility.PUBLIC,
          createdById: admin.entity.id,
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: admin.entity.id,
        },
      },
      activeMemberships: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.MAIN,
          visibility: OrganizationMembershipVisibility.PUBLIC,
        },
      },
    },
  });
  /** A membership that stays, thus a write of the replay is visible */
  await prisma.organization.create({
    data: {
      name: "Andere Organisation",
      spectrumId: "OTHERORG",
      createdById: admin.entity.id,
      membershipHistoryEntries: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.AFFILIATE,
          visibility: OrganizationMembershipVisibility.PUBLIC,
          createdById: admin.entity.id,
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: admin.entity.id,
        },
      },
      activeMemberships: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.AFFILIATE,
          visibility: OrganizationMembershipVisibility.PUBLIC,
        },
      },
    },
  });

  await signIn(admin.user);
  const otherTab = await context.newPage();
  for (const tab of [page, otherTab]) {
    await tab.goto(`/app/spynet/organization/${organization.id}`);
    await expect(tab.getByText("Mitglieder (1)")).toBeVisible();
  }

  await removeMembership(otherTab);
  await expect(otherTab.getByText(REMOVED_TEXT)).toBeVisible();
  await expect(otherTab.getByText("Keine Mitglieder")).toBeVisible();

  /** The first tab still shows the member until its own request */
  await expect(page.getByText("Mitglieder (1)")).toBeVisible();
  const writersBefore = await getActiveMembershipWriters(
    prisma,
    member.entity.id,
  );
  await removeMembership(page);

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();
  expect(await getActiveMembershipWriters(prisma, member.entity.id)).toEqual(
    writersBefore,
  );
  expect(
    await prisma.organizationMembershipHistoryEntry.count({
      where: { type: OrganizationMembershipType.LEFT },
    }),
  ).toBe(1);
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_REMOVED" },
    }),
  ).toBe(1);
});

test("a deleted citizen gets no new membership", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  const deletedCitizen = await createCitizen(prisma, {
    handle: "org-geloescht",
  });
  await prisma.citizen.update({
    where: { id: deletedCitizen.entity.id },
    /** A deleted citizen keeps no login, see Citizen_deleted_login_check */
    data: { deletedAt: new Date(), userId: null },
  });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: admin.entity.id,
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/organization/${organization.id}`);

  const dialog = modal(page, "Citizen hinzufügen");
  await clickUntilVisible(
    membershipsTile(page).getByRole("button", { name: "Hinzufügen" }),
    dialog,
  );
  await dialog
    .getByLabel("Citizen (Internal ID)")
    .fill(deletedCitizen.entity.id);
  await dialog
    .getByRole("button", { name: "Speichern und bestätigen" })
    .click();

  /** The same answer as for an unknown ID */
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await prisma.organizationMembershipHistoryEntry.count()).toBe(0);
  expect(await prisma.activeOrganizationMembership.count()).toBe(0);
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_CREATED" },
    }),
  ).toBe(0);
});

test("a citizen deleted while its page was open gets no new membership", async ({
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
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${member.entity.id}/organizations`);

  const dialog = modal(page, "Organisation hinzufügen");
  await clickUntilVisible(
    sectionByHeading(page, "Aktuell").getByRole("button", {
      name: "Hinzufügen",
    }),
    dialog,
  );
  await dialog.getByLabel("Organisation (Internal ID)").fill(organization.id);

  /** A different user deletes the citizen */
  await prisma.citizen.update({
    where: { id: member.entity.id },
    data: { deletedAt: new Date(), userId: null },
  });
  await dialog
    .getByRole("button", { name: "Speichern und bestätigen" })
    .click();

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** The refresh shows that the citizen is gone */
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  expect(await prisma.organizationMembershipHistoryEntry.count()).toBe(0);
  expect(await prisma.activeOrganizationMembership.count()).toBe(0);
  expect(
    await prisma.auditEvent.count({
      where: { type: "ORGANIZATION_MEMBERSHIP_CREATED" },
    }),
  ).toBe(0);
});

test("a citizen deleted while the page was open gets no removal and no decision", async ({
  context,
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-organisator",
    permissionStrings: ORGANIZATION_ADMIN_PERMISSIONS,
  });
  const member = await createCitizen(prisma, { handle: "org-mitglied" });
  const rumoredMember = await createCitizen(prisma, {
    handle: "org-geruecht",
  });
  const organization = await prisma.organization.create({
    data: {
      name: "Testorganisation",
      spectrumId: "TESTORG",
      createdById: admin.entity.id,
      membershipHistoryEntries: {
        create: [
          {
            citizenId: member.entity.id,
            type: OrganizationMembershipType.MAIN,
            visibility: OrganizationMembershipVisibility.PUBLIC,
            createdById: admin.entity.id,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: new Date(),
            confirmedById: admin.entity.id,
          },
          {
            citizenId: rumoredMember.entity.id,
            type: OrganizationMembershipType.AFFILIATE,
            visibility: OrganizationMembershipVisibility.PUBLIC,
            createdById: admin.entity.id,
          },
        ],
      },
      activeMemberships: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.MAIN,
          visibility: OrganizationMembershipVisibility.PUBLIC,
        },
      },
    },
  });

  await signIn(admin.user);
  /** The refresh after the removal would remove the decision buttons */
  const decisionTab = await context.newPage();
  for (const tab of [page, decisionTab]) {
    await tab.goto(`/app/spynet/organization/${organization.id}`);
    await expect(tab.getByText("Mitglieder (1)")).toBeVisible();
    await waitForAppShellHydration(tab);
  }

  const writersBefore = await getActiveMembershipWriters(
    prisma,
    member.entity.id,
  );
  /** A different user deletes both citizens */
  await prisma.citizen.updateMany({
    where: { id: { in: [member.entity.id, rumoredMember.entity.id] } },
    data: { deletedAt: new Date(), userId: null },
  });

  await removeMembership(page);
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** The refresh shows the list without the deleted citizen */
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();

  await unconfirmedRow(decisionTab, "org-geruecht")
    .getByRole("button", { name: "Bestätigen", exact: true })
    .click();
  await expect(decisionTab.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** After the refresh, the entry of the deleted citizen offers no decision */
  await expect(
    decisionTab.getByRole("row").filter({ hasText: "Unbestätigt" }),
  ).toHaveCount(1);
  await expect(
    decisionTab.getByRole("button", { name: "Bestätigen", exact: true }),
  ).toHaveCount(0);

  expect(
    await prisma.organizationMembershipHistoryEntry.findMany({
      orderBy: { type: "asc" },
      select: { citizenId: true, type: true, confirmed: true },
    }),
  ).toEqual([
    {
      citizenId: member.entity.id,
      type: OrganizationMembershipType.MAIN,
      confirmed: ConfirmationStatus.CONFIRMED,
    },
    {
      citizenId: rumoredMember.entity.id,
      type: OrganizationMembershipType.AFFILIATE,
      confirmed: null,
    },
  ]);
  expect(await getActiveMembershipWriters(prisma, member.entity.id)).toEqual(
    writersBefore,
  );
  expect(
    await prisma.auditEvent.count({
      where: {
        type: {
          in: [
            "ORGANIZATION_MEMBERSHIP_REMOVED",
            "ORGANIZATION_MEMBERSHIP_CONFIRMED",
          ],
        },
      },
    }),
  ).toBe(0);
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
