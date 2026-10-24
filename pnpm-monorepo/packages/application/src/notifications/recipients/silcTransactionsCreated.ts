import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";
import { findCitizenIdsWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

export interface FindSilcTransactionRecipientsInput {
  readonly transactionIds: readonly string[];
}

/** The receiver of one transaction */
export interface SilcTransactionRecipient extends Recipient {
  readonly transactionId: string;
  readonly value: number;
  readonly description: string | null;
}

/**
 * One recipient for each transaction whose receiver can log in and read the
 * own transactions
 */
export const findSilcTransactionRecipients = async (
  context: ApplicationContext,
  input: FindSilcTransactionRecipientsInput,
): Promise<SilcTransactionRecipient[]> => {
  const transactions = await context.prisma.silcTransaction.findMany({
    where: {
      id: {
        in: [...input.transactionIds],
      },
    },
    select: {
      id: true,
      receiverId: true,
      value: true,
      description: true,
    },
  });
  if (transactions.length <= 0) return [];

  const recipientIds = await findCitizenIdsWithPermissions(
    context,
    { id: { in: transactions.map((transaction) => transaction.receiverId) } },
    [
      LOGIN_MANAGE_PERMISSION_SET,
      { resource: "silcTransactionOfCurrentCitizen", operation: "read" },
    ],
  );

  return transactions
    .filter((transaction) => recipientIds.has(transaction.receiverId))
    .map((transaction) => ({
      citizenId: transaction.receiverId,
      transactionId: transaction.id,
      value: transaction.value,
      description: transaction.description,
    }));
};
