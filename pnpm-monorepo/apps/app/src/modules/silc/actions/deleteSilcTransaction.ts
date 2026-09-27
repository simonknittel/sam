"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { updateSilcBalances } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deleteSilcTransaction = createAuthenticatedAction(
  "deleteSilcTransaction",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize(
        "silcTransactionOfOtherCitizen",
        "delete",
      ))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Check if transaction exists and is not already deleted
     */
    const existingTransaction = await prisma.silcTransaction.findUnique({
      where: {
        id: data.id,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });
    if (!existingTransaction || existingTransaction.deletedAt)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    /**
     * (Soft-)delete transaction
     */
    const deletedById = authentication.session.entity.id;
    const deletedEntry = await prisma.$transaction(async (transaction) => {
      const entry = await transaction.silcTransaction.update({
        where: {
          id: data.id,
        },
        data: {
          deletedAt: new Date(),
          deletedBy: {
            connect: {
              id: deletedById,
            },
          },
        },
      });

      /** The balance changes in the same transaction as the ledger */
      await updateSilcBalances(transaction, [entry.receiverId]);

      return entry;
    });

    await createAuditEvents([
      {
        type: AuditEventType.SILC_TRANSACTION_DELETED,
        data: {
          transactionId: deletedEntry.id,
          receiverId: deletedEntry.receiverId,
          value: deletedEntry.value,
          description: deletedEntry.description,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/silc`);
    revalidatePath("/app/silc/transactions");
    revalidatePath("/app/dashboard");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
