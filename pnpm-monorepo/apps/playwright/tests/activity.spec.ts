import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  RoleAssignmentChangeType,
} from "@sam-monorepo/database/client";
import {
  createCitizen,
  ONE_DAY_MS,
  ONE_MINUTE_MS,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  dateParam,
  fillUntilUrl,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** Mirrors ACTIVITY_PAGE_SIZE of the app's activity module */
const ACTIVITY_PAGE_SIZE = 50;

/** Only roles the reader may see contribute role history rows */
const ROLE_HISTORY_PERMISSIONS = ["otherRole;read;roleId=*"];

test("the spynet activity table paginates and filters", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "aktivitaets-leser",
    permissionStrings: [
      "spynetActivity;read",
      "citizen;read",
      "organization;read",
      "organizationMembership;read",
      ...ROLE_HISTORY_PERMISSIONS,
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });

  const organization = await prisma.organization.create({
    data: {
      name: "Sinister Incorporated",
      spectrumId: "S1NISTER",
      createdById: viewer.entity.id,
      createdAt: new Date(Date.now() - 10 * ONE_DAY_MS),
    },
  });

  /** One entry more than a page holds, so the second page is never empty */
  const MEMBERSHIP_ENTRIES = ACTIVITY_PAGE_SIZE + 1;
  await prisma.organizationMembershipHistoryEntry.createMany({
    data: Array.from({ length: MEMBERSHIP_ENTRIES }, (unused, index) => ({
      organizationId: organization.id,
      citizenId: target.entity.id,
      type: OrganizationMembershipType.MAIN,
      visibility: OrganizationMembershipVisibility.PUBLIC,
      confirmed: ConfirmationStatus.CONFIRMED,
      createdById: viewer.entity.id,
      createdAt: new Date(Date.now() - (index + 1) * ONE_MINUTE_MS),
    })),
  });

  // The newest entry of all, so it has to head the first page
  await prisma.roleAssignmentChange.create({
    data: {
      citizenId: target.entity.id,
      roleId: viewer.role.id,
      type: RoleAssignmentChangeType.ADD,
      createdById: viewer.entity.id,
    },
  });

  await signIn(viewer.user);
  await page.goto("/app/spynet/activity");

  await expect(page.locator("tbody tr")).toHaveCount(ACTIVITY_PAGE_SIZE, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.locator("tbody tr").first()).toContainText("Rolle");
  await expect(page.getByRole("button", { name: "Zurück" })).toBeDisabled();

  // The remaining membership entries plus the organization's creation
  await clickUntilUrl(
    page,
    page.getByRole("button", { name: "Weiter" }),
    /cursor=/,
  );
  await expect(page.locator("tbody tr")).toHaveCount(
    MEMBERSHIP_ENTRIES + 2 - ACTIVITY_PAGE_SIZE,
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  await expect(page.getByText("Erstellt unter dem Namen")).toBeVisible();

  // Walking back lands on the first page again
  await clickUntilUrl(
    page,
    page.getByRole("button", { name: "Zurück" }),
    /direction=prev/,
  );
  await expect(page.locator("tbody tr")).toHaveCount(ACTIVITY_PAGE_SIZE, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Erstellt unter dem Namen")).toHaveCount(0);

  // The type filter queries only the source it names
  await page.goto("/app/spynet/activity?type=role-assignment");
  await expect(page.locator("tbody tr")).toHaveCount(1, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.locator("tbody tr").first()).toContainText("Rolle");

  // The actor filter keeps only that actor's entries
  await page.goto(`/app/spynet/activity?actor=${target.entity.id}`);
  await expect(page.getByText("Keine Aktivität für diese Filter.")).toBeVisible(
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );

  // The date range drops everything recorded before it
  await page.goto("/app/spynet/activity");
  const fromDate = dateParam(new Date(Date.now() - 5 * ONE_DAY_MS));
  await fillUntilUrl(
    page,
    page.getByLabel("Von"),
    fromDate,
    new RegExp(`from=${fromDate}`),
  );
  await expect(page.getByText("Erstellt unter dem Namen")).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.locator("tbody tr").first()).toContainText("Rolle");
});

test("the citizen's role history only shows for readable roles", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const target = await createCitizen(prisma, { handle: "zielperson" });

  const reader = await createCitizen(prisma, {
    handle: "rollen-leser",
    permissionStrings: ["citizen;read", ...ROLE_HISTORY_PERMISSIONS],
  });
  const outsider = await createCitizen(prisma, {
    handle: "ohne-rollenrecht",
    permissionStrings: ["citizen;read"],
  });

  await prisma.roleAssignmentChange.create({
    data: {
      citizenId: target.entity.id,
      roleId: reader.role.id,
      type: RoleAssignmentChangeType.ADD,
      createdById: reader.entity.id,
    },
  });

  await signIn(reader.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/roles`);
  await expect(page.getByRole("heading", { name: "Verlauf" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.locator("tbody tr")).toHaveCount(1);

  await switchUser(outsider.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/roles`);
  await expect(page.getByRole("heading", { name: "Rollen" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByRole("heading", { name: "Verlauf" })).toHaveCount(0);
});
