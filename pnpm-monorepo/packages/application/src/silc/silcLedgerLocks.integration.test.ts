import { prisma } from "@sam-monorepo/database";
import {
  bookBalancesToZero,
  endCollectionPhaseInTransaction,
  updateSilcBalances,
} from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { runAgainstLockHolder } from "../../test/locks.js";
import { expireAllSilc } from "./expireAllSilc.js";

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

/** The bookings of "expire all" write the citizen of the actor as creator */
const createManager = async () => {
  const citizen = await prisma.citizen.create({ data: { handle: "manager" } });

  return createTestActor({
    userId: "manager-user",
    citizen: { id: citizen.id, handle: citizen.handle },
    permissionStrings: ["silcBalanceOfOtherCitizen;manage"],
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

describe("bookBalancesToZero", () => {
  test("two parallel runs book each balance one time", async () => {
    const pilot = await createCitizenWithLedger("pilot", [100, -30]);
    const miner = await createCitizenWithLedger("miner", [50]);
    const manager = await createManager();
    const { context } = createTestApplicationContext();

    const [firstRun, secondRun] = await runAgainstLockHolder(
      (transaction) =>
        bookBalancesToZero(transaction, {
          description: "Verfallen",
          createdById: null,
        }),
      () => expireAllSilc(context, manager),
    );

    expect(
      firstRun.balances.toSorted((left, right) => left.value - right.value),
    ).toEqual([
      { citizenId: miner.id, value: 50 },
      { citizenId: pilot.id, value: 70 },
    ]);
    expect(secondRun).toEqual({
      citizen_count: 0,
      expired_value: 0,
      reset_citizen_count: 0,
      reset_value: 0,
    });
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
    const manager = await createManager();
    const { context } = createTestApplicationContext();

    const [collectionBookingIds, expired] = await runAgainstLockHolder(
      (transaction) =>
        endCollectionPhaseInTransaction(transaction, {
          cycleId: cycle.id,
          endedById: null,
          endedAt: new Date(),
        }),
      () => expireAllSilc(context, manager),
    );

    expect(collectionBookingIds).toHaveLength(1);
    expect(expired).toEqual({
      citizen_count: 0,
      expired_value: 0,
      reset_citizen_count: 0,
      reset_value: 0,
    });
    expect(
      await prisma.silcTransaction.findMany({
        where: { value: { lt: 0 } },
        select: { value: true, profitDistributionCycleId: true },
      }),
    ).toEqual([{ value: -100, profitDistributionCycleId: cycle.id }]);
    expect(await getBalance(pilot.id)).toBe(0);
  });
});

describe("updateSilcBalances", () => {
  /**
   * Both transactions write the ledger before they take the ledger lock, as
   * a caller that forgets `lockSilcLedger()` would do. The lock in the
   * balance update keeps the balance correct.
   */
  test("two parallel ledger writes for one citizen are both in the balance", async () => {
    const citizen = await prisma.citizen.create({ data: { handle: "pilot" } });

    await runAgainstLockHolder(
      async (transaction) => {
        await transaction.silcTransaction.create({
          data: { receiverId: citizen.id, value: 10 },
        });
        await updateSilcBalances(transaction, [citizen.id]);
      },
      () =>
        prisma.$transaction(async (transaction) => {
          await transaction.silcTransaction.create({
            data: { receiverId: citizen.id, value: 5 },
          });
          await updateSilcBalances(transaction, [citizen.id]);
        }),
    );

    const { silcBalance, totalEarnedSilc } =
      await prisma.citizen.findUniqueOrThrow({ where: { id: citizen.id } });
    expect(silcBalance).toBe(15);
    expect(totalEarnedSilc).toBe(15);
  });
});
