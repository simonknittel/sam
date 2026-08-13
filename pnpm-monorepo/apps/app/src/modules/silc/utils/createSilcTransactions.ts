import { prisma } from "@/db";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import type { Prisma, SilcTransaction } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { updateCitizensSilcBalances } from "./updateCitizensSilcBalances";

interface NewSilcTransaction {
  receiverId: SilcTransaction["receiverId"];
  value: SilcTransaction["value"];
  description?: SilcTransaction["description"];
  createdById?: SilcTransaction["createdById"];
}

interface Options {
  /**
   * Runs in the same database transaction as the created rows, e.g. the
   * profit-distribution cycle updates that must be atomic with the debits.
   */
  readonly additionalOperations?: Prisma.PrismaPromise<unknown>[];
}

/**
 * Creates SILC transactions and maintains the invariant every SILC path
 * shares: create the rows, rebuild the receivers' balances, notify the
 * receivers and revalidate the SILC surfaces. Callers write their own
 * audit events and revalidate any caller-specific paths themselves.
 *
 * The lambda's salary disbursement performs the same sequence with its own
 * EventBridge transport and cannot import this module.
 *
 * @returns The ids of the created transactions
 */
export const createSilcTransactions = async (
  transactions: NewSilcTransaction[],
  options?: Options,
) => {
  const [createdTransactions] = await prisma.$transaction([
    prisma.silcTransaction.createManyAndReturn({
      data: transactions,
      select: {
        id: true,
      },
    }),
    ...(options?.additionalOperations ?? []),
  ]);

  const transactionIds = createdTransactions.map(
    (transaction) => transaction.id,
  );

  const receiverIds = [
    ...new Set(transactions.map((transaction) => transaction.receiverId)),
  ];
  if (receiverIds.length > 0) await updateCitizensSilcBalances(receiverIds);

  if (transactionIds.length > 0) {
    await triggerNotifications([
      {
        type: "SilcTransactionsCreated",
        payload: {
          transactionIds,
        },
      },
    ]);
  }

  revalidatePath("/app/silc");
  revalidatePath("/app/silc/transactions");
  revalidatePath("/app/dashboard");

  return transactionIds;
};
