import type { Locator, Page } from "@playwright/test";
import type { PrismaClient, Role } from "@sam-monorepo/database/client";
import {
  IamSettingKey,
  TaskRewardType,
  TaskVisibility,
} from "@sam-monorepo/database/client";
import {
  createCitizen,
  createRole,
  createRoleTag,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  closeRolePicker,
  modal,
  openRolePicker,
  pickRole,
  pickRoleTag,
  rolePickerChips,
  rolePickerOption,
  rolePickerPopover,
  rolePickerSearchField,
  rolePickerTag,
  SAVED_TEXT,
  searchRolePicker,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The role picker offers only the roles that the viewer can see. The
 * personal role of each test citizen is not one of them.
 */
const readPermissions = (roles: readonly Pick<Role, "id">[]) =>
  roles.map((role) => `otherRole;read;roleId=${role.id}`);

/** The setting of the Human Resources roles, a role picker with a maximum */
const openHumanResourcesSetting = async (page: Page) => {
  await page.goto("/app/iam/settings");
  await waitForAppShellHydration(page);

  const settingTile = sectionByHeading(page, "Human Resources");
  return {
    settingTile,
    trigger: settingTile.getByRole("button", { name: "Rolle auswählen" }),
  };
};

const readHumanResourcesRoleIds = async (prisma: PrismaClient) => {
  const setting = await prisma.iamSetting.findUnique({
    where: { key: IamSettingKey.HUMAN_RESOURCES_ROLE_IDS },
    select: { value: true },
  });
  return (setting?.value as string[] | undefined)?.toSorted();
};

const expectActiveOption = async (popover: Locator, roleName: string) => {
  const optionId = await rolePickerOption(popover, roleName).getAttribute("id");
  expect(optionId).not.toBeNull();
  await expect(popover.getByRole("combobox")).toHaveAttribute(
    "aria-activedescendant",
    optionId ?? "",
  );
};

test("the role picker finds roles by name and by tag, a tag adds its visible roles, and a click in the list deselects a role", async ({
  page,
  prisma,
  signIn,
}) => {
  const doctor = await createRole(prisma, { name: "Bordarzt" });
  const mechanic = await createRole(prisma, { name: "Mechaniker" });
  const navigator = await createRole(prisma, { name: "Navigator" });
  const pilot = await createRole(prisma, { name: "Pilot" });
  const secretRole = await createRole(prisma, { name: "Geheimdienst" });
  await createRoleTag(prisma, {
    name: "Flugcrew",
    description: "Alle Rollen im Cockpit",
    roles: [pilot, navigator, secretRole],
  });
  await createRoleTag(prisma, { name: "Werkstatt", roles: [mechanic] });
  /** With `role;manage`, the viewer sees this tag, but the picker offers none of its roles */
  await createRoleTag(prisma, { name: "Verdeckt", roles: [secretRole] });
  const admin = await createCitizen(prisma, {
    handle: "rollen-admin",
    permissionStrings: [
      "role;manage",
      ...readPermissions([doctor, mechanic, navigator, pilot]),
    ],
  });

  await signIn(admin.user);
  const { settingTile, trigger } = await openHumanResourcesSetting(page);
  const popover = await openRolePicker(trigger);
  const options = popover.getByRole("option");

  await expect(options).toHaveText([
    "Bordarzt",
    "Mechaniker",
    "Navigator",
    "Pilot",
  ]);
  await expect(popover.getByRole("button")).toHaveText([
    "Flugcrew",
    "Werkstatt",
  ]);
  await expect(rolePickerTag(popover, "Flugcrew")).toHaveAttribute(
    "title",
    "Alle Rollen im Cockpit",
  );

  /**
   * The search
   */
  await searchRolePicker(popover, "Navi");
  await expect(options).toHaveText(["Navigator"]);

  await searchRolePicker(popover, "Werkstatt");
  await expect(options).toHaveText(["Mechaniker"]);

  await searchRolePicker(popover, "Flugcrew");
  await expect(options).toHaveText(["Navigator", "Pilot"]);

  await searchRolePicker(popover, "Xylophon");
  await expect(options).toHaveCount(0);
  await expect(popover.getByText("Keine Rolle gefunden")).toBeVisible();

  await searchRolePicker(popover, "");
  await expect(options).toHaveCount(4);

  /**
   * A tag adds its offered roles, and a role that is already selected stays
   * selected
   */
  await rolePickerOption(popover, "Pilot").click();
  await expect(rolePickerOption(popover, "Pilot")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await rolePickerTag(popover, "Flugcrew").click();
  await expect(rolePickerChips(settingTile)).toHaveText(["Navigator", "Pilot"]);
  await expect(popover).toBeVisible();

  /**
   * A click on a selected role deselects it
   */
  await rolePickerOption(popover, "Navigator").click();
  await expect(rolePickerOption(popover, "Navigator")).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(rolePickerChips(settingTile)).toHaveText(["Pilot"]);

  await closeRolePicker(popover);
  await settingTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  expect(await readHumanResourcesRoleIds(prisma)).toEqual([pilot.id]);
});

test("the role picker works with the keyboard and gives the focus back to its trigger", async ({
  page,
  prisma,
  signIn,
}) => {
  const roles = [
    await createRole(prisma, { name: "Bordarzt" }),
    await createRole(prisma, { name: "Co-Pilot" }),
    await createRole(prisma, { name: "Mechaniker" }),
    await createRole(prisma, { name: "Pilot" }),
  ];
  const pilot = roles[3]!;
  const admin = await createCitizen(prisma, {
    handle: "tastatur-admin",
    permissionStrings: ["role;manage", ...readPermissions(roles)],
  });

  await signIn(admin.user);
  const { settingTile, trigger } = await openHumanResourcesSetting(page);
  const popover = rolePickerPopover(page);
  const searchField = rolePickerSearchField(popover);

  /** A key press before the hydration of the setting has no effect */
  await expect(async () => {
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(popover).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await expect(searchField).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expectActiveOption(popover, "Bordarzt");
  await page.keyboard.press("ArrowDown");
  await expectActiveOption(popover, "Co-Pilot");
  await page.keyboard.press("End");
  await expectActiveOption(popover, "Pilot");
  await page.keyboard.press("Home");
  await expectActiveOption(popover, "Bordarzt");

  /** Enter selects the active role, and a second Enter deselects it */
  await page.keyboard.press("Enter");
  await expect(rolePickerChips(settingTile)).toHaveText(["Bordarzt"]);
  await page.keyboard.press("Enter");
  await expect(rolePickerChips(settingTile)).toHaveCount(0);

  /**
   * During a search, the list stays in name order, and Enter selects the
   * best match
   */
  await page.keyboard.type("Pilot");
  await expect(popover.getByRole("option")).toHaveText(["Co-Pilot", "Pilot"]);
  await expectActiveOption(popover, "Pilot");
  await page.keyboard.press("Enter");
  await expect(rolePickerChips(settingTile)).toHaveText(["Pilot"]);
  await expect(searchField).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await settingTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  expect(await readHumanResourcesRoleIds(prisma)).toEqual([pilot.id]);
});

test("a required role picker stops the submit of its form without a role and shows why", async ({
  page,
  prisma,
  signIn,
}) => {
  await createRole(prisma, { name: "Bezahlte Rolle" });
  const admin = await createCitizen(prisma, {
    handle: "silc-einsteller",
    permissionStrings: [
      "silcSetting;manage",
      "silcBalanceOfOtherCitizen;manage",
      "otherRole;read;roleId=*",
    ],
  });

  await signIn(admin.user);
  await page.goto("/app/silc/settings");
  await waitForAppShellHydration(page);

  /** A role salary needs a role */
  const salaryTile = sectionByHeading(page, "Gehälter");
  const addSalaryRow = salaryTile.getByRole("button", { name: "Neu" });
  await expect(addSalaryRow).toBeVisible();
  await addSalaryRow.click();
  await salaryTile.getByLabel("SILC").fill("40");
  await salaryTile.getByLabel("Tag im Monat").fill("15");
  await salaryTile.getByRole("button", { name: "Speichern" }).click();

  const trigger = salaryTile.getByRole("button", { name: "Rolle auswählen" });
  const requiredText = salaryTile.getByText("Wähle eine Rolle aus.");
  await expect(requiredText).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAccessibleDescription("Wähle eine Rolle aus.");
  expect(await prisma.silcRoleSalary.count()).toBe(0);

  await pickRole(trigger, "Bezahlte Rolle");
  await expect(requiredText).not.toBeVisible();
  await salaryTile.getByRole("button", { name: "Speichern" }).click();
  await expect
    .poll(() => prisma.silcRoleSalary.count({ where: { value: 40 } }))
    .toBe(1);
});

test("in the edit dialog of a task, Escape closes only the role picker, and a role that the viewer cannot see stays required after a save", async ({
  page,
  prisma,
  signIn,
}) => {
  const navigator = await createRole(prisma, { name: "Navigator" });
  const pilot = await createRole(prisma, { name: "Pilot" });
  const secretRole = await createRole(prisma, { name: "Geheimdienst" });
  await createRoleTag(prisma, {
    name: "Flugcrew",
    roles: [pilot, navigator, secretRole],
  });
  /** Without `role;manage`, the viewer does not see a tag of only hidden roles */
  await createRoleTag(prisma, { name: "Verdeckt", roles: [secretRole] });
  const creator = await createCitizen(prisma, {
    handle: "task-auftraggeber",
    permissionStrings: ["task;read", ...readPermissions([navigator, pilot])],
  });
  const task = await prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      createdById: creator.entity.id,
      requiredRoles: { connect: [{ id: pilot.id }, { id: secretRole.id }] },
    },
  });
  /** Without the read marker, the first visit refreshes the page */
  await prisma.readMarker.create({
    data: { citizenId: creator.entity.id, taskId: task.id },
  });

  await signIn(creator.user);
  await page.goto(`/app/tasks/${task.id}`);
  await waitForAppShellHydration(page);

  const dialog = modal(page, "Erforderliche Rolle bearbeiten");
  await clickUntilVisible(
    page.getByRole("button", { name: "Erforderliche Rolle bearbeiten" }),
    dialog,
  );
  await expect(rolePickerChips(dialog)).toHaveText([
    "Pilot",
    "Verborgene Rolle",
  ]);

  const trigger = dialog.getByRole("button", { name: "Rolle auswählen" });
  const popover = await openRolePicker(trigger);
  await expect(popover.getByRole("button")).toHaveText(["Flugcrew"]);
  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(trigger).toBeFocused();

  /** The tag adds only the role that the viewer can see */
  await pickRoleTag(trigger, "Flugcrew");
  await expect(dialog).toBeVisible();
  await expect(rolePickerChips(dialog)).toHaveText([
    "Navigator",
    "Pilot",
    "Verborgene Rolle",
  ]);

  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(dialog).not.toBeVisible();

  const savedTask = await prisma.task.findUniqueOrThrow({
    where: { id: task.id },
    select: { requiredRoles: { select: { id: true } } },
  });
  expect(savedTask.requiredRoles.map((role) => role.id).toSorted()).toEqual(
    [navigator.id, pilot.id, secretRole.id].toSorted(),
  );
});

test("the role picker of the Human Resources roles disables the roles and the tags above the maximum", async ({
  page,
  prisma,
  signIn,
}) => {
  /** One more than the maximum of 20 (`MAX_HUMAN_RESOURCES_ROLES`) */
  const roles: Role[] = [];
  for (let number = 1; number <= 21; number++) {
    roles.push(
      await createRole(prisma, {
        name: `Rolle ${String(number).padStart(2, "0")}`,
      }),
    );
  }
  await createRoleTag(prisma, {
    name: "Nachzügler",
    roles: [roles[19]!, roles[20]!],
  });
  await prisma.iamSetting.create({
    data: {
      key: IamSettingKey.HUMAN_RESOURCES_ROLE_IDS,
      value: roles.slice(0, 19).map((role) => role.id),
    },
  });
  const admin = await createCitizen(prisma, {
    handle: "maximum-admin",
    permissionStrings: ["role;manage", ...readPermissions(roles)],
  });

  await signIn(admin.user);
  const { settingTile, trigger } = await openHumanResourcesSetting(page);
  await expect(rolePickerChips(settingTile)).toHaveCount(19);
  const popover = await openRolePicker(trigger);
  const tag = rolePickerTag(popover, "Nachzügler");

  /** 19 selected roles and the two roles of the tag are more than 20 */
  await expect(tag).toBeDisabled();
  await expect(tag).toHaveAttribute("title", /mehr als 20 Rollen/);

  /** At the maximum, the roles that are not selected are disabled */
  await rolePickerOption(popover, "Rolle 20").click();
  const lastRole = rolePickerOption(popover, "Rolle 21");
  await expect(lastRole).toBeDisabled();
  await expect(lastRole).toHaveAttribute("title", /maximal 20 Rollen/);
  await lastRole.click({ force: true });
  await expect(lastRole).toHaveAttribute("aria-selected", "false");

  /** Below the maximum, the role and the tag are enabled again */
  await rolePickerOption(popover, "Rolle 01").click();
  await expect(lastRole).toBeEnabled();
  await expect(tag).toBeEnabled();
  await tag.click();
  await expect(lastRole).toHaveAttribute("aria-selected", "true");
  await expect(rolePickerChips(settingTile)).toHaveCount(20);

  await closeRolePicker(popover);
  await settingTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  expect(await readHumanResourcesRoleIds(prisma)).toEqual(
    roles
      .slice(1)
      .map((role) => role.id)
      .toSorted(),
  );
});
