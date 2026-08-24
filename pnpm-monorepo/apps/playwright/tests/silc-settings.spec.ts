import { expectAuditEvents } from "../fixtures/audit";
import {
  assignRole,
  createCitizen,
  createRole,
  createSilcTransaction,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * Managing the settings also means paying every role — so the manager needs
 * to see the roles and the balances the tiles compute their totals from.
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

  /**
   * The conversion rate
   */
  const rateTile = sectionByHeading(page, "aUEC Umrechnungskurs");
  await rateTile.getByLabel("Wie viel aUEC entspricht ein SILC?").fill("2500");
  await rateTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(
      () =>
        prisma.silcSetting.findUnique({
          where: { key: "AUEC_CONVERSION_RATE" },
        }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({ value: "2500" });

  /**
   * A salary for a role, which the tile prices with the rate above
   */
  const salaryTile = sectionByHeading(page, "Gehälter");
  /** The rows only render once the roles came back through tRPC */
  const addSalaryRow = salaryTile.getByRole("button", { name: "Neu" });
  await expect(addSalaryRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await addSalaryRow.click();

  const rolePicker = page.getByRole("dialog", { name: "Rolle auswählen" });
  await clickUntilVisible(
    salaryTile.getByRole("button", { name: "Rolle auswählen" }),
    rolePicker,
  );
  await rolePicker.getByText("Bezahlte Rolle").click();

  await salaryTile.getByLabel("SILC").fill("40");
  await salaryTile.getByLabel("Tag im Monat").fill("15");
  await salaryTile.getByRole("button", { name: "Speichern" }).click();

  /** The rate above already left a success toast, so the row is the proof */
  await expect
    .poll(() => prisma.silcRoleSalary.findFirst(), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toMatchObject({ roleId: paidRole.id, value: 40, dayOfMonth: 15 });

  await expectAuditEvents(prisma, [
    "SILC_SETTING_UPDATED",
    "SALARY_CONFIG_UPDATED",
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
  await createSilcTransaction(prisma, {
    receiverId: rich.entity.id,
    value: 120,
  });

  await signIn(admin.user);
  await page.goto("/app/silc/settings");
  await waitForAppShellHydration(page);

  const otherTile = sectionByHeading(page, "Other");
  await otherTile.getByRole("button", { name: "Expire all SILC" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // Every positive balance is booked away, the untouched one stays as it is
  await expect
    .poll(
      () =>
        prisma.entity.findUniqueOrThrow({
          where: { id: rich.entity.id },
          select: { silcBalance: true },
        }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
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

  /**
   * The refresh recomputes the denormalized balances from the transactions,
   * so a balance tampered with behind the app's back is corrected.
   */
  await prisma.entity.update({
    where: { id: rich.entity.id },
    data: { silcBalance: 999 },
  });

  await otherTile
    .getByRole("button", { name: "Refresh SILC balances" })
    .click();

  /** The expiry above already left a success toast, so the balance is it */
  await expect
    .poll(
      () =>
        prisma.entity.findUniqueOrThrow({
          where: { id: rich.entity.id },
          select: { silcBalance: true },
        }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({ silcBalance: 0 });

  await page.goto("/app/silc/transactions");
  await expect(
    page.getByRole("row").filter({ hasText: "Verfallen" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  await expectAuditEvents(prisma, [
    "SILC_ALL_EXPIRED",
    "SILC_BALANCES_REFRESHED",
  ]);
});
