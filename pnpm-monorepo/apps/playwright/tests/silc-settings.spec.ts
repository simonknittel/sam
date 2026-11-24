import { expectAuditEvents } from "../fixtures/audit";
import {
  assignRole,
  createCitizen,
  createRole,
  createRoleTag,
  createSilcTransaction,
} from "../fixtures/factories";
import {
  closeRolePicker,
  openRolePicker,
  pickRole,
  rolePickerOption,
  rolePickerTag,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The tiles compute their totals from the roles and the balances, so the
 * manager needs to see them.
 */
const SETTINGS_ADMIN_PERMISSIONS = [
  "silcSetting;manage",
  "silcBalanceOfOtherCitizen;manage",
  "otherRole;read;roleId=*",
];

test("the aUEC conversion rate and the role salaries are edited through the settings", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "silc-einsteller",
    permissionStrings: SETTINGS_ADMIN_PERMISSIONS,
  });
  const paidRole = await createRole(prisma, { name: "Bezahlte Rolle" });
  const member = await createCitizen(prisma, { handle: "gehalts-empfaenger" });
  await assignRole(prisma, member.entity, paidRole);

  await signIn(admin.user);
  await page.goto("/app/silc/settings");
  await waitForAppShellHydration(page);

  const rateTile = sectionByHeading(page, "aUEC Umrechnungskurs");
  await rateTile.getByLabel("Wie viel aUEC entspricht ein SILC?").fill("2500");
  await rateTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await expect
    .poll(() =>
      prisma.silcSetting.findUnique({
        where: { key: "AUEC_CONVERSION_RATE" },
      }),
    )
    .toMatchObject({ value: "2500" });

  const salaryTile = sectionByHeading(page, "Gehälter");
  const addSalaryRow = salaryTile.getByRole("button", { name: "Neu" });
  await expect(addSalaryRow).toBeVisible();
  await addSalaryRow.click();

  await pickRole(
    salaryTile.getByRole("button", { name: "Rolle auswählen" }),
    "Bezahlte Rolle",
  );

  const selectedRoleTrigger = salaryTile.getByRole("button", {
    name: "Bezahlte Rolle",
  });
  await expect(selectedRoleTrigger).toBeFocused();

  await pickRole(selectedRoleTrigger, "Bezahlte Rolle");
  await expect(selectedRoleTrigger).toBeVisible();

  await salaryTile.getByLabel("SILC").fill("40");
  await salaryTile.getByLabel("Tag im Monat").fill("15");
  await salaryTile.getByRole("button", { name: "Speichern" }).click();

  /** The rate above already left a success toast, so the row is the proof */
  await expect
    .poll(() => prisma.silcRoleSalary.findFirst())
    .toMatchObject({ roleId: paidRole.id, value: 40, dayOfMonth: 15 });

  await expectAuditEvents(prisma, [
    "SILC_SETTING_UPDATED",
    "SALARY_CONFIG_UPDATED",
  ]);
});

test("a tag in the salary role picker filters the list to its roles, and a second click clears the filter", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "silc-einsteller",
    permissionStrings: SETTINGS_ADMIN_PERMISSIONS,
  });
  const taggedRole = await createRole(prisma, { name: "Getaggte Rolle" });
  await createRole(prisma, { name: "Andere Rolle" });
  await createRoleTag(prisma, {
    name: "Gehaltsgruppe",
    roles: [taggedRole],
  });

  await signIn(admin.user);
  await page.goto("/app/silc/settings");
  await waitForAppShellHydration(page);

  const salaryTile = sectionByHeading(page, "Gehälter");
  const addSalaryRow = salaryTile.getByRole("button", { name: "Neu" });
  await expect(addSalaryRow).toBeVisible();
  await addSalaryRow.click();

  const trigger = salaryTile.getByRole("button", { name: "Rolle auswählen" });
  const popover = await openRolePicker(trigger);
  const tag = rolePickerTag(popover, "Gehaltsgruppe");
  await expect(rolePickerOption(popover, "Andere Rolle")).toBeVisible();

  await tag.click();
  await expect(tag).toHaveAttribute("aria-pressed", "true");
  await expect(rolePickerOption(popover, "Getaggte Rolle")).toBeVisible();
  await expect(rolePickerOption(popover, "Andere Rolle")).toHaveCount(0);
  await expect(popover).toBeVisible();

  await tag.click();
  await expect(tag).toHaveAttribute("aria-pressed", "false");
  await expect(rolePickerOption(popover, "Getaggte Rolle")).toBeVisible();
  await expect(rolePickerOption(popover, "Andere Rolle")).toBeVisible();

  await closeRolePicker(popover);
  await expect(trigger).toHaveText("Rolle auswählen");
});

test("a saved salary of a role that the viewer cannot see stays listed, and a save keeps it", async ({
  page,
  prisma,
  signIn,
}) => {
  const visibleRole = await createRole(prisma, { name: "Sichtbare Rolle" });
  const hiddenRole = await createRole(prisma, { name: "Verdeckte Rolle" });
  const admin = await createCitizen(prisma, {
    handle: "silc-einsteller",
    permissionStrings: [
      ...SETTINGS_ADMIN_PERMISSIONS.filter(
        (permission) => !permission.startsWith("otherRole;read"),
      ),
      `otherRole;read;roleId=${visibleRole.id}`,
    ],
  });
  await prisma.silcRoleSalary.create({
    data: { roleId: hiddenRole.id, value: 25, dayOfMonth: 5 },
  });

  await signIn(admin.user);
  await page.goto("/app/silc/settings");
  await waitForAppShellHydration(page);

  const salaryTile = sectionByHeading(page, "Gehälter");
  const addSalaryRow = salaryTile.getByRole("button", { name: "Neu" });
  await expect(addSalaryRow).toBeVisible();
  await expect(
    salaryTile.getByRole("button", { name: "Verborgene Rolle" }),
  ).toBeVisible();

  await addSalaryRow.click();
  const popover = await openRolePicker(
    salaryTile.getByRole("button", { name: "Rolle auswählen" }),
  );
  await expect(popover.getByRole("option")).toHaveText(["Sichtbare Rolle"]);
  await rolePickerOption(popover, "Sichtbare Rolle").click();
  await expect(popover).not.toBeVisible();

  await salaryTile.getByLabel("SILC").last().fill("40");
  await salaryTile.getByLabel("Tag im Monat").last().fill("15");
  await salaryTile.getByRole("button", { name: "Speichern" }).click();
  /** The tile shows the success text, too, thus the toast alone is not unique */
  await expect(salaryTile.getByText(SAVED_TEXT)).toBeVisible();

  /** A save deletes and creates all rows, thus the hidden role must be in its request */
  await expect
    .poll(async () => {
      const salaries = await prisma.silcRoleSalary.findMany({
        select: { roleId: true, value: true, dayOfMonth: true },
      });
      return salaries.toSorted((first, second) => first.value - second.value);
    })
    .toEqual([
      { roleId: hiddenRole.id, value: 25, dayOfMonth: 5 },
      { roleId: visibleRole.id, value: 40, dayOfMonth: 15 },
    ]);
});

test("expiring all SILC zeroes every balance, and the refresh recomputes them", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "silc-einsteller",
    permissionStrings: [
      ...SETTINGS_ADMIN_PERMISSIONS,
      "silcTransactionOfOtherCitizen;read",
    ],
  });
  const rich = await createCitizen(prisma, { handle: "silc-reicher" });
  const poor = await createCitizen(prisma, { handle: "silc-armer" });
  const debtor = await createCitizen(prisma, { handle: "silc-schuldner" });
  await createSilcTransaction(prisma, {
    receiverId: rich.entity.id,
    value: 120,
  });
  await createSilcTransaction(prisma, {
    receiverId: debtor.entity.id,
    value: -40,
  });

  await signIn(admin.user);
  await page.goto("/app/silc/settings");
  await waitForAppShellHydration(page);

  const silcSum = sectionByHeading(page, "aUEC Umrechnungskurs")
    .getByText("SILC", { exact: true })
    .locator("..");
  await expect(silcSum).toHaveText("SILC120");

  const otherTile = sectionByHeading(page, "Other");
  await otherTile.getByRole("button", { name: "Expire all SILC" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(silcSum).toHaveText("SILC0");

  await expect
    .poll(() =>
      prisma.citizen.findUniqueOrThrow({
        where: { id: rich.entity.id },
        select: { silcBalance: true },
      }),
    )
    .toMatchObject({ silcBalance: 0 });
  const expiry = await prisma.silcTransaction.findFirstOrThrow({
    where: { receiverId: rich.entity.id, value: { lt: 0 } },
  });
  expect(expiry).toMatchObject({ value: -120, description: "Verfallen" });
  expect(
    await prisma.silcTransaction.count({
      where: { receiverId: poor.entity.id },
    }),
  ).toBe(0);
  const reset = await prisma.silcTransaction.findFirstOrThrow({
    where: { receiverId: debtor.entity.id, value: { gt: 0 } },
  });
  expect(reset).toMatchObject({
    value: 40,
    description: "Verfallen",
    resetsNegativeBalance: true,
  });
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: debtor.entity.id },
      select: { silcBalance: true, totalEarnedSilc: true },
    }),
  ).toEqual({ silcBalance: 0, totalEarnedSilc: 0 });

  await prisma.citizen.update({
    where: { id: rich.entity.id },
    data: { silcBalance: 999 },
  });
  await page.reload();
  await waitForAppShellHydration(page);
  await expect(silcSum).toHaveText("SILC999");

  await otherTile
    .getByRole("button", { name: "Refresh SILC balances" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(silcSum).toHaveText("SILC0");

  await expect
    .poll(() =>
      prisma.citizen.findUniqueOrThrow({
        where: { id: rich.entity.id },
        select: { silcBalance: true },
      }),
    )
    .toMatchObject({ silcBalance: 0 });

  await page.goto("/app/silc/transactions");
  await expect(
    page.getByRole("row").filter({ hasText: "Verfallen" }),
  ).toHaveCount(2);

  await expectAuditEvents(prisma, [
    "SILC_ALL_EXPIRED_V2",
    "SILC_BALANCES_REFRESHED",
  ]);
});
