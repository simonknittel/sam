import {
  AuditEventType,
  lockSilcLedger,
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

export const deleteSilcTransactionInputSchema = z.object({
  transaction_id: idSchema,
});

export type DeleteSilcTransactionInput = z.infer<
  typeof deleteSilcTransactionInputSchema
>;

export const deleteSilcTransaction = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteSilcTransactionInput,
): Promise<SilcTransactionOutput> =>
  withSpan(context, "deleteSilcTransaction", async () => {
    requirePermission(actor, "silcTransactionOfOtherCitizen", "delete");
    const citizen = requireCitizen(actor);

    /** The claim after the ledger lock makes a parallel delete change nothing */
    const deletedTransaction = await context.prisma.$transaction(
      async (transaction) => {
        await lockSilcLedger(transaction);

        const [deleted] = await transaction.silcTransaction.updateManyAndReturn(
          {
            where: { id: input.transaction_id, deletedAt: null },
            data: { deletedAt: context.now(), deletedById: citizen.id },
            select: SILC_TRANSACTION_OUTPUT_SELECT,
          },
        );
        if (!deleted)
          throw new NotFoundError(SilcErrorMessage.TransactionNotFound);

        await updateSilcBalances(transaction, [deleted.receiverId]);

        return deleted;
      },
    );

    await context.audit.create([
      {
        type: AuditEventType.SILC_TRANSACTION_DELETED,
        data: {
          transactionId: deletedTransaction.id,
          receiverId: deletedTransaction.receiverId,
          value: deletedTransaction.value,
          description: deletedTransaction.description,
        },
        createdById: actor.userId,
      },
    ]);

    return toSilcTransactionOutput(deletedTransaction);
  });
