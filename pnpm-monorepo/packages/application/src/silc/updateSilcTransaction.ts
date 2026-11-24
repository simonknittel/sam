import {
  AuditEventType,
  lockSilcLedger,
  SILC_DESCRIPTION_MAXIMUM_LENGTH,
  SILC_VALUE_MAXIMUM,
  updateSilcBalances,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { SilcErrorMessage } from "./silcErrors.js";
import {
  SILC_TRANSACTION_OUTPUT_SELECT,
  toSilcTransactionOutput,
  type SilcTransactionOutput,
} from "./silcTransactionOutput.js";

export const updateSilcTransactionInputSchema = z.object({
  transaction_id: idSchema,
  value: z
    .int()
    .min(-SILC_VALUE_MAXIMUM)
    .max(SILC_VALUE_MAXIMUM)
    .describe("A negative value takes SILC away."),
  description: z
    .string()
    .trim()
    .max(SILC_DESCRIPTION_MAXIMUM_LENGTH)
    .optional()
    .describe("Without a description, the description does not change."),
});

export type UpdateSilcTransactionInput = z.infer<
  typeof updateSilcTransactionInputSchema
>;

export const updateSilcTransaction = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateSilcTransactionInput,
): Promise<SilcTransactionOutput> =>
  withSpan(context, "updateSilcTransaction", async () => {
    requirePermission(actor, "silcTransactionOfOtherCitizen", "update");
    const citizen = requireCitizen(actor);

    /**
     * The read comes after the ledger lock, thus a parallel delete or update
     * cannot come between the read and the write
     */
    const { previousTransaction, updatedTransaction } =
      await context.prisma.$transaction(async (transaction) => {
        await lockSilcLedger(transaction);

        const previous = await transaction.silcTransaction.findFirst({
          where: { id: input.transaction_id, deletedAt: null },
          select: { value: true, description: true },
        });
        if (!previous)
          throw new NotFoundError(SilcErrorMessage.TransactionNotFound);

        const updated = await transaction.silcTransaction.update({
          where: { id: input.transaction_id },
          data: {
            value: input.value,
            description: input.description,
            updatedAt: context.now(),
            updatedById: citizen.id,
          },
          select: SILC_TRANSACTION_OUTPUT_SELECT,
        });

        await updateSilcBalances(transaction, [updated.receiverId]);

        return { previousTransaction: previous, updatedTransaction: updated };
      });

    await context.audit.create([
      {
        type: AuditEventType.SILC_TRANSACTION_UPDATED,
        data: {
          transactionId: updatedTransaction.id,
          previousValue: previousTransaction.value,
          newValue: updatedTransaction.value,
          previousDescription:
            previousTransaction.description ?? updatedTransaction.description,
          newDescription: updatedTransaction.description,
          receiverId: updatedTransaction.receiverId,
        },
        createdById: actor.userId,
      },
    ]);

    return toSilcTransactionOutput(updatedTransaction);
  });
