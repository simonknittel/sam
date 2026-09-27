import { prisma, type SilcTransaction } from "@sam-monorepo/database";
import { findCitizenIdsWithPermissions } from "../../common/effectivePermissions";
import { publishNotifications } from "../publish";

interface Payload {
  transactionIds: SilcTransaction["id"][];
}

export const SilcTransactionsCreatedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients
   */
  const transactions = await prisma.silcTransaction.findMany({
    where: {
      id: {
        in: payload.transactionIds,
      },
    },
    select: {
      id: true,
      receiverId: true,
      value: true,
      description: true,
    },
  });
  if (transactions.length <= 0) return;

  const recipientIds = await findCitizenIdsWithPermissions(
    { id: { in: transactions.map((transaction) => transaction.receiverId) } },
    [
      { resource: "login", operation: "manage" },
      { resource: "silcTransactionOfCurrentCitizen", operation: "read" },
    ],
  );
  if (recipientIds.size === 0) return;

  /**
   * Publish notifications
   */
  await publishNotifications(
    transactions
      .filter((transaction) => recipientIds.has(transaction.receiverId))
      .map((transaction) => ({
        receiverId: transaction.receiverId,
        notificationType: "silc_transaction_created" as const,
        payload: {
          transactionId: transaction.id,
          value: transaction.value,
          description: transaction.description,
        },
        title: "SILC-Transaktion erhalten",
        body: `${transaction.value >= 0 ? "+" : "-"}${Math.abs(transaction.value).toLocaleString("de")} SILC - ${transaction.description}`,
      })),
  );
};
