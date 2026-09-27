import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "../citizen/activeCitizen.js";
import { lockSilcLedger } from "./lockSilcLedger.js";
import { updateSilcBalances } from "./updateSilcBalances.js";

interface Options {
  readonly description: string;
  /** The citizen who starts the booking, NULL for the midnight job */
  readonly createdById: string | null;
  readonly profitDistributionCycleId?: string;
}

interface BookedBalance {
  readonly citizenId: string;
  /** The positive balance before the booking */
  readonly value: number;
}

/**
 * Books the positive SILC balance of each citizen that is not deleted away:
 * one negative booking for each citizen, then the balance update. "Expire
 * all" and the end of a collection phase both use this function.
 *
 * The balances come from the ledger in the transaction of the caller, not
 * from the cached copy on the citizen. The ledger lock makes sure that no
 * other ledger write can come between the read and the booking. Thus two
 * parallel calls cannot book the same balance two times: the second call
 * waits and then reads a balance of 0.
 *
 * It takes the client from the caller, thus this package still creates no
 * database client itself.
 */
export const bookPositiveBalancesAway = async (
  transaction: Prisma.TransactionClient,
  { description, createdById, profitDistributionCycleId }: Options,
) => {
  await lockSilcLedger(transaction);

  const sums = await transaction.silcTransaction.groupBy({
    by: ["receiverId"],
    where: { deletedAt: null, receiver: ACTIVE_CITIZEN_WHERE },
    _sum: { value: true },
    having: { value: { _sum: { gt: 0 } } },
  });
  const balances: BookedBalance[] = sums.map((sum) => ({
    citizenId: sum.receiverId,
    value: sum._sum.value ?? 0,
  }));

  const createdTransactions =
    await transaction.silcTransaction.createManyAndReturn({
      data: balances.map(({ citizenId, value }) => ({
        receiverId: citizenId,
        value: -value,
        description,
        createdById,
        profitDistributionCycleId,
      })),
      select: { id: true },
    });

  await updateSilcBalances(
    transaction,
    balances.map(({ citizenId }) => citizenId),
  );

  return {
    balances,
    transactionIds: createdTransactions.map((created) => created.id),
  };
};
