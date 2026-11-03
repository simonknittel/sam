import {
  AuditEventType,
  createSilcTransactionsInTransaction,
  SILC_DESCRIPTION_MAXIMUM_LENGTH,
  SILC_VALUE_MAXIMUM,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { SilcErrorMessage } from "./silcErrors.js";
import { announceSilcTransactions, areActiveReceivers } from "./silcLedger.js";

/** An arbitrary limit that keeps the bookings of one request bounded */
const MAXIMUM_SILC_RECEIVERS = 250;

export const createSilcTransactionInputSchema = z.object({
  receiver_ids: z
    .array(idSchema)
    .min(1)
    .max(MAXIMUM_SILC_RECEIVERS)
    .describe("Each receiver gets one transaction, also a repeated one."),
  value: z
    .int()
    .min(-SILC_VALUE_MAXIMUM)
    .max(SILC_VALUE_MAXIMUM)
    .describe("A negative value takes SILC away."),
  description: z
    .string()
    .trim()
    .max(SILC_DESCRIPTION_MAXIMUM_LENGTH)
    .optional(),
});

export type CreateSilcTransactionInput = z.infer<
  typeof createSilcTransactionInputSchema
>;

export interface CreateSilcTransactionOutput {
  readonly transaction_ids: string[];
}

/**
 * Books one SILC transaction for each receiver and notifies the receivers.
 * Requires `silcTransactionOfOtherCitizen;create` and a citizen, who becomes
 * the creator of the transactions.
 *
 * @throws ConflictError when a receiver does not exist or is deleted
 */
export const createSilcTransaction = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateSilcTransactionInput,
): Promise<CreateSilcTransactionOutput> =>
  withSpan(context, "createSilcTransaction", async () => {
    requirePermission(actor, "silcTransactionOfOtherCitizen", "create");
    const citizen = requireCitizen(actor);

    if (!(await areActiveReceivers(context.prisma, input.receiver_ids)))
      throw new ConflictError(SilcErrorMessage.InactiveReceiver);

    const transactionIds = await context.prisma.$transaction((transaction) =>
      createSilcTransactionsInTransaction(
        transaction,
        input.receiver_ids.map((receiverId) => ({
          receiverId,
          value: input.value,
          description: input.description,
          createdById: citizen.id,
        })),
      ),
    );

    await context.audit.create([
      {
        type: AuditEventType.SILC_TRANSACTION_CREATED,
        data: {
          transactionIds,
          receiverIds: input.receiver_ids,
          value: input.value,
          description: input.description,
        },
        createdById: actor.userId,
      },
    ]);

    await announceSilcTransactions(context, transactionIds);

    return { transaction_ids: transactionIds };
  });
