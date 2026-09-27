import { prisma } from "@sam-monorepo/database";
import { updateSilcBalances } from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import { truncateAllTables } from "../../test/database";

/**
 * Enough time for the second transaction to wait for the lock of the first.
 * If it takes longer on a slow machine, the test passes without a race.
 */
const LOCK_WAIT_MILLISECONDS = 300;

beforeEach(async () => {
  await truncateAllTables();
});

describe("updateSilcBalances", () => {
  test("two parallel ledger writes for one citizen are both in the balance", async () => {
    const citizen = await prisma.citizen.create({ data: { handle: "pilot" } });

    let releaseFirstTransaction = () => {};
    const firstTransactionMayCommit = new Promise<void>((resolve) => {
      releaseFirstTransaction = resolve;
    });
    let signalBalanceLocked = () => {};
    const balanceLocked = new Promise<void>((resolve) => {
      signalBalanceLocked = resolve;
    });

    const firstWrite = prisma.$transaction(async (transaction) => {
      await transaction.silcTransaction.create({
        data: { receiverId: citizen.id, value: 10 },
      });
      await updateSilcBalances(transaction, [citizen.id]);
      signalBalanceLocked();
      await firstTransactionMayCommit;
    });

    await balanceLocked;
    const secondWrite = prisma.$transaction(async (transaction) => {
      await transaction.silcTransaction.create({
        data: { receiverId: citizen.id, value: 5 },
      });
      await updateSilcBalances(transaction, [citizen.id]);
    });

    await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_MILLISECONDS));
    releaseFirstTransaction();
    await Promise.all([firstWrite, secondWrite]);

    const { silcBalance, totalEarnedSilc } =
      await prisma.citizen.findUniqueOrThrow({ where: { id: citizen.id } });
    expect(silcBalance).toBe(15);
    expect(totalEarnedSilc).toBe(15);
  });
});
