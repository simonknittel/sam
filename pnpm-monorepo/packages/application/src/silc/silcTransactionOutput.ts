import type { Prisma } from "@sam-monorepo/database/client";

export const SILC_TRANSACTION_OUTPUT_SELECT = {
  id: true,
  receiverId: true,
  value: true,
  description: true,
} as const satisfies Prisma.SilcTransactionSelect;

export interface SilcTransactionOutput {
  readonly id: string;
  readonly receiver_id: string;
  readonly value: number;
  readonly description: string | null;
}

export const toSilcTransactionOutput = (
  transaction: Prisma.SilcTransactionGetPayload<{
    select: typeof SILC_TRANSACTION_OUTPUT_SELECT;
  }>,
): SilcTransactionOutput => ({
  id: transaction.id,
  receiver_id: transaction.receiverId,
  value: transaction.value,
  description: transaction.description,
});
