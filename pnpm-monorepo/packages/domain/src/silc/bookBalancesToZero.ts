import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "../citizen/activeCitizen.js";
import { lockSilcLedger } from "./lockSilcLedger.js";
import { updateSilcBalances } from "./updateSilcBalances.js";

/** Which balances `bookBalancesToZero()` books to 0 */
export enum BalancesToBook {
  /** The SILC of the positive balances expire, a negative balance stays */
  Positive = "positive",
  /**
   * Also a negative balance goes to 0, with a positive booking. Only the end
   * of a SINcome collection phase does this: such a booking has the cycle,
   * thus it does not count as earned SILC (see `updateSilcBalances()`).
   */
  All = "all",
}

const BALANCE_HAVING: Record<
  BalancesToBook,
  Prisma.SilcTransactionScalarWhereWithAggregatesInput
> = {
  [BalancesToBook.Positive]: { value: { _sum: { gt: 0 } } },
  [BalancesToBook.All]: { value: { _sum: { not: 0 } } },
};

interface Options {
  readonly balances: BalancesToBook;
  readonly description: string;
  /** The citizen who starts the booking, NULL for the midnight job */
  readonly createdById: string | null;
  readonly profitDistributionCycleId?: string;
}

interface BookedBalance {
  readonly citizenId: string;
  /** The balance before the booking, never 0 */
  readonly value: number;
}

/**
 * Books the SILC balance of each citizen that is not deleted to 0: one
 * booking of the opposite value for each citizen, then the balance update.
 *
 * The balances come from the ledger in the transaction of the caller, not
 * from the cached copy on the citizen. The ledger lock makes sure that no
 * other ledger write can come between the read and the booking. Thus two
 * parallel calls cannot book the same balance two times: the second call
 * waits and then reads a balance of 0.
 */
export const bookBalancesToZero = async (
  transaction: Prisma.TransactionClient,
  {
    balances: balancesToBook,
    description,
    createdById,
    profitDistributionCycleId,
  }: Options,
) => {
  await lockSilcLedger(transaction);

  const sums = await transaction.silcTransaction.groupBy({
    by: ["receiverId"],
    where: { deletedAt: null, receiver: ACTIVE_CITIZEN_WHERE },
    _sum: { value: true },
    having: BALANCE_HAVING[balancesToBook],
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
