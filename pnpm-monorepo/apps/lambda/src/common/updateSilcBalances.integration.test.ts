import { prisma } from "@sam-monorepo/database";
import { updateSilcBalances } from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import { truncateAllTables } from "../../test/database";
import { runAgainstLockHolder } from "../../test/locks";

beforeEach(async () => {
  await truncateAllTables();
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
