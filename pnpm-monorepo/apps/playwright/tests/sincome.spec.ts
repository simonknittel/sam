import type { Request } from "@playwright/test";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createProfitDistributionCycle,
  createSilcTransaction,
  ONE_DAY_MS,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  dateParam,
  modal,
  SAVED_TEXT,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const MANAGER_PERMISSIONS = [
  "profitDistributionCycle;manage",
  "silcTransactionOfOtherCitizen;read",
  "silcBalanceOfOtherCitizen;read",
  "silcBalanceOfCurrentCitizen;read",
];

/**
 * The cycle page shows a member their own earned SILC during the collection
 * phase, hence the balance permission.
 */
const PARTICIPANT_PERMISSIONS = [
  "profitDistributionCycle;read",
  "silcBalanceOfCurrentCitizen;read",
];

test("ending the collection phase debits every participant", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "sincome-verwalter",
    permissionStrings: MANAGER_PERMISSIONS,
  });
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

  const cycle = await createProfitDistributionCycle(prisma, {
    title: "Q3 Testzyklus",
    createdById: admin.entity.id,
  });

  // A citizen cedes their share during the collection phase
  await signIn(firstParticipant.user);
  await page.goto(`/app/sincome/${cycle.id}`);
  await expect(page.getByText("Sammelphase").first()).toBeVisible();
  await waitForAppShellHydration(page);
  await page.getByRole("button", { name: "Anteil abtreten" }).click();
  await expect(page.getByRole("button", { name: "Widerrufen" })).toBeVisible();
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
  await switchUser(admin.user);
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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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
    createdById: admin.entity.id,
    profitDistributionCycleId: cycle.id,
  });
  expect(debitByReceiver.get(secondParticipant.entity.id)).toMatchObject({
    value: -40,
    description: "SINcome: Q3 Testzyklus",
    createdById: admin.entity.id,
    profitDistributionCycleId: cycle.id,
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

  const balances = await prisma.citizen.findMany({
    where: {
      id: { in: [firstParticipant.entity.id, secondParticipant.entity.id] },
    },
    select: { silcBalance: true },
  });
  expect(balances.map(({ silcBalance }) => silcBalance)).toEqual([0, 0]);

  // The actual end is set, the planned end stays
  const endedCycle = await prisma.profitDistributionCycle.findUniqueOrThrow({
    where: { id: cycle.id },
  });
  expect(endedCycle).toMatchObject({
    collectionEndsAt: cycle.collectionEndsAt,
    collectionEndedById: admin.entity.id,
  });
  expect(endedCycle.collectionEndedAt?.getTime()).toBeLessThanOrEqual(
    Date.now(),
  );

  await expectAuditEvents(prisma, ["PROFIT_CYCLE_COLLECTION_ENDED"]);
});

test("a manager runs a cycle from its creation to a closed payout", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "sincome-verwalter",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  const participant = await createCitizen(prisma, {
    handle: "sincome-teilnehmer",
    permissionStrings: PARTICIPANT_PERMISSIONS,
  });
  await createSilcTransaction(prisma, {
    receiverId: participant.entity.id,
    value: 100,
  });

  /**
   * Create — the collection phase ends tomorrow, so the new cycle starts
   * where every cycle starts.
   */
  await signIn(admin.user);
  await page.goto("/app/sincome");

  const createDialog = modal(page, "Neuer SINcome-Zeitraum");
  await clickUntilVisible(
    page.getByRole("button", { name: "Neuer SINcome-Zeitraum" }),
    createDialog,
  );
  await createDialog.getByLabel("Titel").fill("Q4 Zyklus");
  await createDialog
    .getByLabel("Ende der Sammelphase")
    .fill(dateParam(new Date(Date.now() + ONE_DAY_MS)));
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/sincome\/[a-z0-9]+$/);
  const cycle = await prisma.profitDistributionCycle.findFirstOrThrow();
  expect(cycle).toMatchObject({
    title: "Q4 Zyklus",
    createdById: admin.entity.id,
    collectionEndedAt: null,
    payoutStartedAt: null,
    payoutEndsAt: null,
    payoutEndedAt: null,
  });

  /**
   * Collection ends, which snapshots the balances into participants
   */
  await page.goto(`/app/sincome/${cycle.id}/management`);
  await clickUntilVisible(
    page.getByRole("button", { name: "Phase beenden" }),
    page.getByRole("alertdialog"),
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Beenden" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Vorbereitung der Auszahlung" }),
  ).toBeVisible();

  /**
   * Payout preparation: the surplus is entered and the phase started
   */
  await page.getByLabel("Gesamter aUEC-Überschuss").fill("500.000");
  await page
    .getByLabel("Auszahlungsphase endet am")
    .fill(dateParam(new Date(Date.now() + 7 * ONE_DAY_MS)));

  await clickUntilVisible(
    page.getByRole("button", { name: "Auszahlungsphase starten" }),
    page.getByRole("alertdialog"),
  );
  /** Else the toast of the end of the collection phase passes the check */
  await expect(page.getByText(SAVED_TEXT)).toBeHidden();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Starten" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Auszahlung", exact: true }),
  ).toBeVisible();

  await expect
    .poll(async () => {
      const started = await prisma.profitDistributionCycle.findUniqueOrThrow({
        where: { id: cycle.id },
      });
      return {
        auecProfit: Number(started.auecProfit),
        started: started.payoutStartedAt !== null,
        hasPlannedEnd: started.payoutEndsAt !== null,
      };
    })
    .toEqual({ auecProfit: 500_000, started: true, hasPlannedEnd: true });
  const { payoutEndsAt } =
    await prisma.profitDistributionCycle.findUniqueOrThrow({
      where: { id: cycle.id },
    });

  /**
   * The member has to accept their payout themselves
   */
  await switchUser(participant.user);
  await page.goto(`/app/sincome/${cycle.id}`);
  await waitForAppShellHydration(page);
  await expect(page.getByText("Zustimmung ausstehend")).toBeVisible();
  await page.getByRole("button", { name: "Auszahlung zustimmen" }).click();

  await expect
    .poll(async () => {
      const row =
        await prisma.profitDistributionCycleParticipant.findUniqueOrThrow({
          where: {
            cycleId_citizenId: {
              cycleId: cycle.id,
              citizenId: participant.entity.id,
            },
          },
        });
      return row.acceptedAt !== null;
    })
    .toBe(true);

  await page.reload();
  await expect(page.getByText("Auszahlung ausstehend")).toBeVisible();

  /**
   * The manager records the payout and closes the cycle
   */
  await switchUser(admin.user);
  await page.goto(`/app/sincome/${cycle.id}/management`);
  await waitForAppShellHydration(page);

  /**
   * The checkbox input itself is sr-only — the visible control is the box
   * its wrapping label draws, so toggling goes through the label.
   */
  const disbursedCheckbox = page.getByRole("checkbox", {
    name: "Ausgezahlt: sincome-teilnehmer",
  });
  await toggleLabel(page, disbursedCheckbox).click();
  await expect(disbursedCheckbox).toBeChecked();
  await expect
    .poll(async () => {
      const row =
        await prisma.profitDistributionCycleParticipant.findUniqueOrThrow({
          where: {
            cycleId_citizenId: {
              cycleId: cycle.id,
              citizenId: participant.entity.id,
            },
          },
        });
      return row.disbursedAt !== null;
    })
    .toBe(true);

  /**
   * The attribute form saves debounced, and its action refreshes the page
   * behind the scenes; a reload keeps that re-render out of the next
   * interaction.
   */
  await page.reload();
  await waitForAppShellHydration(page);

  const endPayoutDialog = page.getByRole("alertdialog");
  /** The payout card renders above the collection card, whose button is off */
  await clickUntilVisible(
    page.getByRole("button", { name: "Phase beenden" }).first(),
    endPayoutDialog,
  );
  await expect(page.getByText("Auszahlung beenden?")).toBeVisible();
  await endPayoutDialog.getByRole("button", { name: "Beenden" }).click();

  /** The actual end is set, which closes the cycle. The planned end stays. */
  await expect
    .poll(async () => {
      const closed = await prisma.profitDistributionCycle.findUniqueOrThrow({
        where: { id: cycle.id },
      });
      return {
        ended: (closed.payoutEndedAt?.getTime() ?? Infinity) <= Date.now(),
        endedById: closed.payoutEndedById,
        payoutEndsAt: closed.payoutEndsAt,
      };
    })
    .toEqual({ ended: true, endedById: admin.entity.id, payoutEndsAt });
  await page.reload();
  await expect(page.getByText("Abgeschlossene Phase").first()).toBeVisible();

  await expectAuditEvents(prisma, [
    "PROFIT_CYCLE_CREATED",
    "PROFIT_CYCLE_COLLECTION_ENDED",
    "PROFIT_CYCLE_PAYOUT_STARTED",
    "PROFIT_CYCLE_PARTICIPANT_UPDATED",
    "PROFIT_CYCLE_PAYOUT_ENDED",
    "PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED",
  ]);
});

test("the payout checkboxes keep the focus while their saves refresh the table", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "sincome-verwalter",
    permissionStrings: MANAGER_PERMISSIONS,
  });
  /** The table sorts by the name, thus the first citizen comes first */
  const firstCitizen = await createCitizen(prisma, {
    handle: "sincome-erster",
  });
  const secondCitizen = await createCitizen(prisma, {
    handle: "sincome-zweiter",
  });

  /** A cycle in its payout phase, in which both citizens accepted */
  const cycle = await prisma.profitDistributionCycle.create({
    data: {
      title: "Auszahlungszyklus",
      createdById: manager.entity.id,
      collectionEndsAt: new Date(Date.now() - 2 * ONE_DAY_MS),
      collectionEndedAt: new Date(Date.now() - 2 * ONE_DAY_MS),
      payoutStartedAt: new Date(Date.now() - ONE_DAY_MS),
      payoutEndsAt: new Date(Date.now() + 7 * ONE_DAY_MS),
      auecProfit: BigInt(1_000_000),
      participants: {
        create: [firstCitizen, secondCitizen].map((citizen) => ({
          citizenId: citizen.entity.id,
          silcBalanceSnapshot: 100,
          acceptedAt: new Date(),
        })),
      },
    },
  });

  const managementPage = `/app/sincome/${cycle.id}/management`;
  /** A server action posts to the address of the page it runs on */
  const isSaveRequest = (request: Request) =>
    request.method() === "POST" &&
    new URL(request.url()).pathname === managementPage &&
    request.headers()["next-action"] !== undefined;

  await signIn(manager.user);
  await page.goto(managementPage);
  /** Each toggle saves once, thus the page has to be hydrated first */
  await waitForAppShellHydration(page);

  const firstCheckbox = page.getByRole("checkbox", {
    name: "Ausgezahlt: sincome-erster",
  });
  const secondCheckbox = page.getByRole("checkbox", {
    name: "Ausgezahlt: sincome-zweiter",
  });

  await firstCheckbox.focus();
  const firstSave = page.waitForResponse((response) =>
    isSaveRequest(response.request()),
  );
  await page.keyboard.press("Space");
  await firstSave;

  /**
   * The save refreshes the page, which renders the table again with the new
   * status. The rows must stay in place: a new row would take the focus away
   * from the checkbox.
   */
  await expect(
    page.locator("tr", { hasText: "sincome-erster" }).getByText("Ausgezahlt", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(firstCheckbox).toBeChecked();
  await expect(firstCheckbox).toBeFocused();

  /**
   * The row of the second citizen: the popover trigger and the link of the
   * citizen, the consent, then the payout
   */
  for (let step = 0; step < 4; step += 1) await page.keyboard.press("Tab");
  await expect(secondCheckbox).toBeFocused();
  await page.keyboard.press("Space");
  await expect(secondCheckbox).toBeChecked();

  await expect
    .poll(async () => {
      const participants =
        await prisma.profitDistributionCycleParticipant.findMany({
          where: { cycleId: cycle.id },
          select: { citizenId: true, disbursedAt: true },
        });
      return Object.fromEntries(
        participants.map((participant) => [
          participant.citizenId,
          participant.disbursedAt !== null,
        ]),
      );
    })
    .toEqual({
      [firstCitizen.entity.id]: true,
      [secondCitizen.entity.id]: true,
    });
});
