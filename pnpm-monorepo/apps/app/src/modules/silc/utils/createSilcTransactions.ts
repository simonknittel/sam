import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import type { Prisma, SilcTransaction } from "@sam-monorepo/database/client";
import { lockSilcLedger, updateSilcBalances } from "@sam-monorepo/domain";

export interface NewSilcTransaction {
  receiverId: SilcTransaction["receiverId"];
  value: SilcTransaction["value"];
  description?: SilcTransaction["description"];
  createdById?: SilcTransaction["createdById"];
  taskId?: SilcTransaction["taskId"];
  profitDistributionCycleId?: SilcTransaction["profitDistributionCycleId"];
}

/**
 * Creates SILC transactions and rebuilds the balances of their receivers in
 * the transaction of the caller, so that the cached balances can never
 * differ from the ledger. After the commit, call
 * `announceSilcTransactions()` with the returned ids.
 *
 * It takes the ledger lock (see `lockSilcLedger()`). A caller that does more
 * in the same transaction takes the lock first itself, before its other
 * statements.
 *
 * The lambda's salary disbursement performs the same sequence with its own
 * EventBridge transport and cannot import this module.
 *
 * @returns The ids of the created transactions
 */
export const createSilcTransactionsInTransaction = async (
  transaction: Prisma.TransactionClient,
  transactions: readonly NewSilcTransaction[],
) => {
  await lockSilcLedger(transaction);

  const createdTransactions =
    await transaction.silcTransaction.createManyAndReturn({
      data: [...transactions],
      select: {
        id: true,
      },
    });

  await updateSilcBalances(
    transaction,
    transactions.map((newTransaction) => newTransaction.receiverId),
  );

  return createdTransactions.map((created) => created.id);
};

/** Notifies the receivers */
export const announceSilcTransactions = async (
  transactionIds: readonly string[],
) => {
  if (transactionIds.length > 0) {
    await triggerNotifications([
      {
        type: "SilcTransactionsCreated",
        payload: {
          transactionIds: [...transactionIds],
        },
      },
    ]);
  }
};
