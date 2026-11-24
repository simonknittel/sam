import type { Prisma, SilcTransaction } from "@sam-monorepo/database/client";
import { lockSilcLedger } from "./lockSilcLedger.js";
import { updateSilcBalances } from "./updateSilcBalances.js";

export interface NewSilcTransaction {
  readonly receiverId: SilcTransaction["receiverId"];
  readonly value: SilcTransaction["value"];
  readonly description?: SilcTransaction["description"];
  readonly createdById?: SilcTransaction["createdById"];
  readonly taskId?: SilcTransaction["taskId"];
  readonly profitDistributionCycleId?: SilcTransaction["profitDistributionCycleId"];
}

/**
 * After the commit, send the notification `SilcTransactionsCreated` with the
 * returned ids.
 *
 * A caller that does more in the same transaction takes the ledger lock first
 * itself, before its other statements.
 */
export const createSilcTransactionsInTransaction = async (
  transaction: Prisma.TransactionClient,
  transactions: readonly NewSilcTransaction[],
): Promise<string[]> => {
  await lockSilcLedger(transaction);

  const createdTransactions =
    await transaction.silcTransaction.createManyAndReturn({
      data: [...transactions],
      select: { id: true },
    });

  await updateSilcBalances(
    transaction,
    transactions.map((newTransaction) => newTransaction.receiverId),
  );

  return createdTransactions.map((created) => created.id);
};
