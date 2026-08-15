import { createCitizen, createSilcTransaction } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  clickUntilVisible,
  modal,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const SILC_ADMIN_PERMISSIONS = [
  "silcBalanceOfOtherCitizen;read",
  "silcTransactionOfOtherCitizen;manage",
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

  // Value and description first — filling them right after picking a
  // citizen can race the selection's re-render under full-suite load
  await createModal.getByLabel("Wert").fill("42");
  await createModal
    .getByLabel("Beschreibung")
    .fill("Belohnung für den Testeinsatz");

  await createModal
    .getByRole("combobox", { name: "Citizens" })
    .fill("silc-empfaenger");
  const receiverOption = page.getByRole("option", { name: /silc-empfaenger/ });
  await expect(receiverOption).toBeVisible();
  await receiverOption.click();
  await expect(
    createModal.getByRole("link", { name: "silc-empfaenger" }),
  ).toBeVisible();

  await createModal
    .getByRole("button", { name: "Speichern", exact: true })
    .click();

  await expect(page.getByText("Erfolgreich gespeichert.")).toBeVisible({
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

  // Value first — filling it right after picking a citizen can race the
  // selection's re-render under full-suite load
  await createModal.getByLabel("Wert").fill("10");

  await createModal
    .getByRole("combobox", { name: "Citizens" })
    .fill("silc-dauerempfaenger");
  const receiverOption = page.getByRole("option", {
    name: /silc-dauerempfaenger/,
  });
  await expect(receiverOption).toBeVisible();
  await receiverOption.click();
  await expect(
    createModal.getByRole("link", { name: "silc-dauerempfaenger" }),
  ).toBeVisible();

  await createModal
    .getByRole("button", {
      name: "Speichern und weitere Transaktion erstellen",
    })
    .click();

  await expect(page.getByText("Erfolgreich gespeichert.")).toBeVisible({
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

  await expect(page.getByText("Erfolgreich gelöscht")).toBeVisible({
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

test("ending the profit distribution collection phase debits every participant", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "sincome-verwalter",
    permissionStrings: [
      "profitDistributionCycle;manage",
      "silcTransactionOfOtherCitizen;read",
      "silcBalanceOfOtherCitizen;read",
      "silcBalanceOfCurrentCitizen;read",
    ],
  });
  // The cycle page shows the member's own earned SILC during the
  // collection phase, hence the balance permission
  const PARTICIPANT_PERMISSIONS = [
    "profitDistributionCycle;read",
    "silcBalanceOfCurrentCitizen;read",
  ];
  const firstParticipant = await createCitizen(prisma, {
    handle: "sincome-teilnehmer-1",
    permissionStrings: PARTICIPANT_PERMISSIONS,
  });
  const secondParticipant = await createCitizen(prisma, {
    handle: "sincome-teilnehmer-2",
    permissionStrings: PARTICIPANT_PERMISSIONS,
  });
  await createSilcTransaction(prisma, {
    receiverId: firstParticipant.entity.id,
    value: 100,
  });
  await createSilcTransaction(prisma, {
    receiverId: secondParticipant.entity.id,
    value: 40,
  });

  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const cycle = await prisma.profitDistributionCycle.create({
    data: {
      title: "Q3 Testzyklus",
      collectionEndedAt: new Date(Date.now() + TWO_DAYS_MS),
      createdById: admin.entity.id,
    },
  });

  // A citizen cedes their share during the collection phase
  await signIn(firstParticipant.user);
  await page.goto(`/app/sincome/${cycle.id}`);
  // Often the worker's first page load — warm-up can exceed the default 5s
  await expect(page.getByText("Sammelphase").first()).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await waitForAppShellHydration(page);
  await page.getByRole("button", { name: "Anteil abtreten" }).click();
  await expect(page.getByRole("button", { name: "Widerrufen" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const participantRow =
    await prisma.profitDistributionCycleParticipant.findUnique({
      where: {
        cycleId_citizenId: {
          cycleId: cycle.id,
          citizenId: firstParticipant.entity.id,
        },
      },
    });
  expect(participantRow?.cededAt).not.toBeNull();

  // The manager ends the collection phase
  await page.context().clearCookies();
  await signIn(admin.user);
  await page.goto(`/app/sincome/${cycle.id}/management`);
  await clickUntilVisible(
    page.getByRole("button", { name: "Phase beenden" }),
    page.getByRole("alertdialog"),
  );
  await expect(page.getByText("Sammelphase beenden?")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Beenden" })
    .click();
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // Every citizen with a positive balance got debited down to zero
  const debits = await prisma.silcTransaction.findMany({
    where: { value: { lt: 0 } },
  });
  expect(debits).toHaveLength(2);
  const debitByReceiver = new Map(
    debits.map((debit) => [debit.receiverId, debit]),
  );
  expect(debitByReceiver.get(firstParticipant.entity.id)).toMatchObject({
    value: -100,
    description: "SINcome: Q3 Testzyklus",
  });
  expect(debitByReceiver.get(secondParticipant.entity.id)).toMatchObject({
    value: -40,
    description: "SINcome: Q3 Testzyklus",
  });

  const participants = await prisma.profitDistributionCycleParticipant.findMany(
    {
      where: { cycleId: cycle.id },
    },
  );
  expect(participants).toHaveLength(2);
  const snapshotByCitizen = new Map(
    participants.map((participant) => [
      participant.citizenId,
      participant.silcBalanceSnapshot,
    ]),
  );
  expect(snapshotByCitizen.get(firstParticipant.entity.id)).toBe(100);
  expect(snapshotByCitizen.get(secondParticipant.entity.id)).toBe(40);

  const balances = await prisma.entity.findMany({
    where: {
      id: { in: [firstParticipant.entity.id, secondParticipant.entity.id] },
    },
    select: { silcBalance: true },
  });
  expect(balances.map(({ silcBalance }) => silcBalance)).toEqual([0, 0]);

  const endedCycle = await prisma.profitDistributionCycle.findUnique({
    where: { id: cycle.id },
  });
  expect(endedCycle!.collectionEndedAt.getTime()).toBeLessThanOrEqual(
    Date.now(),
  );

  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: "PROFIT_CYCLE_COLLECTION_ENDED" },
  });
  expect(auditEvent).not.toBeNull();
});
