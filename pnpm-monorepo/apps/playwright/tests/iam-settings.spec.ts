import { IamSettingKey } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { assignRole, createCitizen, createRole } from "../fixtures/factories";
import {
  clickUntilVisible,
  pickRoles,
  rolePickerChips,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("the Human Resources roles are selected on the IAM settings page and their holders show on the clearance page", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "iam-admin",
    permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
  });

  const humanResourcesRole = await createRole(prisma, {
    name: "Human Resources",
    maxLevel: 2,
  });
  const leadershipRole = await createRole(prisma, { name: "HR-Leitung" });
  await prisma.role.update({
    where: { id: leadershipRole.id },
    data: { inherits: { connect: { id: humanResourcesRole.id } } },
  });
  const loginBlockingRole = await createRole(prisma, {
    name: "Gesperrt",
    permissionStrings: ["login;negate"],
  });

  const fullMember = await createCitizen(prisma, { handle: "hr-voll" });
  await assignRole(prisma, fullMember.entity, humanResourcesRole, {
    currentLevel: 2,
  });
  const trainee = await createCitizen(prisma, { handle: "hr-lehrling" });
  await assignRole(prisma, trainee.entity, humanResourcesRole, {
    currentLevel: 1,
  });
  const blockedMember = await createCitizen(prisma, { handle: "hr-gesperrt" });
  await assignRole(prisma, blockedMember.entity, humanResourcesRole, {
    currentLevel: 2,
  });
  await assignRole(prisma, blockedMember.entity, loginBlockingRole);
  const deletedMember = await createCitizen(prisma, {
    handle: "hr-geloescht",
  });
  await assignRole(prisma, deletedMember.entity, humanResourcesRole, {
    currentLevel: 2,
  });
  /** A deletion also removes the link to the login */
  await prisma.citizen.update({
    where: { id: deletedMember.entity.id },
    data: { deletedAt: new Date(), userId: null },
  });
  const leader = await createCitizen(prisma, { handle: "hr-leitung" });
  await assignRole(prisma, leader.entity, leadershipRole);

  /**
   * The setting
   */
  await signIn(admin.user);
  await page.goto("/app/iam/settings");
  await waitForAppShellHydration(page);

  const settingTile = sectionByHeading(page, "Human Resources");
  const selectedRoles = rolePickerChips(settingTile);
  await pickRoles(
    settingTile.getByRole("button", { name: "Rolle auswählen" }),
    ["Human Resources"],
  );
  await expect(selectedRoles).toHaveText(["Human Resources"]);

  await settingTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await expect
    .poll(() =>
      prisma.iamSetting.findUnique({
        where: { key: IamSettingKey.HUMAN_RESOURCES_ROLE_IDS },
        select: { value: true },
      }),
    )
    .toEqual({ value: [humanResourcesRole.id] });
  await expectAuditEvents(prisma, ["IAM_SETTING_UPDATED"]);

  await page.reload();
  await expect(selectedRoles).toHaveText(["Human Resources"]);

  /**
   * The contacts on the clearance page. Not listed: below the maximum level,
   * without the login, deleted, and without the role.
   */
  const newcomer = await createCitizen(prisma, {
    handle: "neuling",
    canLogIn: false,
  });
  await switchUser(newcomer.user);
  await page.goto("/clearance");
  await expect(
    page.getByRole("heading", { name: "Anmeldung erfolgreich" }),
  ).toBeVisible();

  const contactsPopup = page.getByRole("dialog", { name: "Human Resources" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Human Resources" }),
    contactsPopup,
  );
  await expect(contactsPopup.getByRole("listitem")).toHaveText([
    "hr-leitung",
    "hr-voll",
  ]);
});

test("without Human Resources roles the clearance page shows plain text", async ({
  page,
  prisma,
  signIn,
}) => {
  /** Only the setting makes a role count, not the name of the role */
  const humanResourcesRole = await createRole(prisma, {
    name: "Human Resources",
  });
  const member = await createCitizen(prisma, { handle: "hr-voll" });
  await assignRole(prisma, member.entity, humanResourcesRole);
  const newcomer = await createCitizen(prisma, {
    handle: "neuling",
    canLogIn: false,
  });

  await signIn(newcomer.user);
  await page.goto("/clearance");
  await expect(
    page.getByText("Bitte melde dich bei Human Resources oder der Leitung"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Human Resources" }),
  ).toHaveCount(0);
});
