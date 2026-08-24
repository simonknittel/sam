import { createCitizen, createSilcTransaction } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  clickUntilVisible,
  DELETED_TEXT,
  fillUntilValue,
  modal,
  pickFromSearch,
  SAVED_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const SILC_ADMIN_PERMISSIONS = [
  "silcBalanceOfOtherCitizen;read",
  "silcTransactionOfOtherCitizen;manage",
  // The transaction modal's citizen picker loads the roster, which
  // requires the citizen read permission
  "citizen;read",
];

test("a transaction created through the UI updates balances and the system log", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "silc-verwalter",
    permissionStrings: [...SILC_ADMIN_PERMISSIONS, "systemLog;read"],
  });
  const receiver = await createCitizen(prisma, { handle: "silc-empfaenger" });

  await signIn(admin.user);
  await page.goto("/app/silc/dashboard");

  const createModal = modal(page, "Transaktion erstellen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Transaktion erstellen" }),
    createModal,
  );

  // The picker below re-renders while its citizens load, which swallows a
  // fill that lands in that window — so both fields insist on their value
  await fillUntilValue(createModal.getByLabel("Wert"), "42");
  await fillUntilValue(
    createModal.getByLabel("Beschreibung"),
    "Belohnung für den Testeinsatz",
  );

  await pickFromSearch(
    page,
    createModal.getByRole("combobox", { name: "Citizens" }),
    "silc-empfaenger",
  );
  await expect(
    createModal.getByRole("link", { name: "silc-empfaenger" }),
  ).toBeVisible();

  await createModal
    .getByRole("button", { name: "Speichern", exact: true })
    .click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(createModal).not.toBeVisible();

  // The citizen shows up in the balances overview with the new balance
  const balanceRow = page
    .getByRole("row")
    .filter({ hasText: "silc-empfaenger" });
  await expect(balanceRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(balanceRow).toContainText("42");

  const transaction = await prisma.silcTransaction.findFirst({
    where: { receiverId: receiver.entity.id },
  });
  expect(transaction).toMatchObject({
    value: 42,
    description: "Belohnung für den Testeinsatz",
  });
  const receiverEntity = await prisma.entity.findUnique({
    where: { id: receiver.entity.id },
  });
  expect(receiverEntity?.silcBalance).toBe(42);
  expect(receiverEntity?.totalEarnedSilc).toBe(42);

  await page.goto("/app/silc/transactions");
  const transactionRow = page
    .getByRole("row")
    .filter({ hasText: "Belohnung für den Testeinsatz" });
  await expect(transactionRow).toBeVisible();
  await expect(transactionRow).toContainText("silc-empfaenger");

  // The audit event renders with its human-readable message
  await page.goto("/app/system-log");
  await expect(
    page.getByText("SILC transaction created: 42 SILC").first(),
  ).toBeVisible();
  await expect(
    page.getByText("SILC_TRANSACTION_CREATED").first(),
  ).toBeVisible();
});

test('"Speichern und weitere Transaktion erstellen" keeps the modal open with a reset form', async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "silc-verwalter",
    permissionStrings: SILC_ADMIN_PERMISSIONS,
  });
  const receiver = await createCitizen(prisma, {
    handle: "silc-dauerempfaenger",
  });

  await signIn(admin.user);
  await page.goto("/app/silc/dashboard");

  const createModal = modal(page, "Transaktion erstellen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Transaktion erstellen" }),
    createModal,
  );

  await fillUntilValue(createModal.getByLabel("Wert"), "10");

  await pickFromSearch(
    page,
    createModal.getByRole("combobox", { name: "Citizens" }),
    "silc-dauerempfaenger",
  );
  await expect(
    createModal.getByRole("link", { name: "silc-dauerempfaenger" }),
  ).toBeVisible();

  await expect(createModal.getByLabel("Wert")).toHaveValue("10");
  await createModal
    .getByRole("button", {
      name: "Speichern und weitere Transaktion erstellen",
    })
    .click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  // The modal must stay open with a reset form (this rides on onSuccess
  // receiving the submitted FormData)
  await expect(createModal).toBeVisible();
  await expect(createModal.getByLabel("Wert")).toHaveValue("1");

  // The selected citizens live in React state and survive the reset, so a
  // plain save now creates a second transaction with the default value
  await createModal
    .getByRole("button", { name: "Speichern", exact: true })
    .click();
  await expect(createModal).not.toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(() =>
      prisma.silcTransaction.count({
        where: { receiverId: receiver.entity.id },
      }),
    )
    .toBe(2);
  const receiverEntity = await prisma.entity.findUnique({
    where: { id: receiver.entity.id },
  });
  expect(receiverEntity?.silcBalance).toBe(11);
});

test("deleting a transaction soft deletes it and reverts the balance", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "silc-verwalter",
    permissionStrings: SILC_ADMIN_PERMISSIONS,
  });
  const receiver = await createCitizen(prisma, { handle: "silc-empfaenger" });
  const transaction = await createSilcTransaction(prisma, {
    receiverId: receiver.entity.id,
    value: 42,
    description: "Fehlbuchung",
    createdById: admin.entity.id,
  });

  await signIn(admin.user);
  await page.goto("/app/silc/transactions");

  const transactionRow = page
    .getByRole("row")
    .filter({ hasText: "Fehlbuchung" });
  await expect(transactionRow).toBeVisible();
  await clickUntilVisible(
    transactionRow.getByTitle("Löschen"),
    page.getByRole("alertdialog"),
  );
  await expect(page.getByText("Transaktion löschen?")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();

  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(transactionRow).not.toBeVisible();

  const deletedTransaction = await prisma.silcTransaction.findUnique({
    where: { id: transaction.id },
  });
  expect(deletedTransaction?.deletedAt).not.toBeNull();
  const receiverEntity = await prisma.entity.findUnique({
    where: { id: receiver.entity.id },
  });
  expect(receiverEntity?.silcBalance).toBe(0);
  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: "SILC_TRANSACTION_DELETED" },
  });
  expect(auditEvent).not.toBeNull();

  // The soft-deleted entry stays reachable through the "Gelöscht" filter
  await clickUntilUrl(
    page,
    page.getByText("Gelöscht", { exact: true }),
    /showDeleted=deleted/,
  );
  await expect(
    page.getByRole("row").filter({ hasText: "Fehlbuchung" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
});
