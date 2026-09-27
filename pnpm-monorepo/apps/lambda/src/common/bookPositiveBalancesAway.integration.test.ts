import { prisma, type Prisma } from "@sam-monorepo/database";
import {
  bookPositiveBalancesAway,
  endCollectionPhaseInTransaction,
  lockSilcLedger,
} from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import { truncateAllTables } from "../../test/database";
import { runAgainstLockHolder } from "../../test/locks";

const createCitizenWithLedger = async (
  handle: string,
  values: readonly number[],
) => {
  const citizen = await prisma.citizen.create({ data: { handle } });
  await prisma.silcTransaction.createMany({
    data: values.map((value) => ({ receiverId: citizen.id, value })),
  });

  return citizen;
};

/** The same transaction as the action "expire all" */
const expireAll = async (transaction: Prisma.TransactionClient) => {
  await lockSilcLedger(transaction);

  return bookPositiveBalancesAway(transaction, {
    description: "Verfallen",
    createdById: null,
  });
};

const getBalance = async (citizenId: string) =>
  (
    await prisma.citizen.findUniqueOrThrow({
      where: { id: citizenId },
      select: { silcBalance: true },
    })
  ).silcBalance;

beforeEach(async () => {
  await truncateAllTables();
});

describe("bookPositiveBalancesAway", () => {
  test("two parallel runs book each balance one time", async () => {
    const pilot = await createCitizenWithLedger("pilot", [100, -30]);
    const miner = await createCitizenWithLedger("miner", [50]);

    const [firstRun, secondRun] = await runAgainstLockHolder(expireAll, () =>
      prisma.$transaction(expireAll),
    );

    expect(
      firstRun.balances.toSorted((left, right) => left.value - right.value),
    ).toEqual([
      { citizenId: miner.id, value: 50 },
      { citizenId: pilot.id, value: 70 },
    ]);
    expect(secondRun).toEqual({ balances: [], transactionIds: [] });
    expect(
      await prisma.silcTransaction.count({
        where: { description: "Verfallen" },
      }),
    ).toBe(2);
    expect(await getBalance(pilot.id)).toBe(0);
    expect(await getBalance(miner.id)).toBe(0);
  });

  test("the collection end and a parallel expire all book a balance one time", async () => {
    const pilot = await createCitizenWithLedger("pilot", [100]);
    const cycle = await prisma.profitDistributionCycle.create({
      data: { title: "Q3", collectionEndsAt: new Date() },
    });

    const [collectionBookingIds, expired] = await runAgainstLockHolder(
      (transaction) =>
        endCollectionPhaseInTransaction(transaction, {
          cycleId: cycle.id,
          endedById: null,
          endedAt: new Date(),
        }),
      () => prisma.$transaction(expireAll),
    );

    expect(collectionBookingIds).toHaveLength(1);
    expect(expired.balances).toEqual([]);
    expect(
      await prisma.silcTransaction.findMany({
        where: { value: { lt: 0 } },
        select: { value: true, profitDistributionCycleId: true },
      }),
    ).toEqual([{ value: -100, profitDistributionCycleId: cycle.id }]);
    expect(await getBalance(pilot.id)).toBe(0);
  });
});
