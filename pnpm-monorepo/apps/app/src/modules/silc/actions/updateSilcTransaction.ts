"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { updateSilcBalances } from "@sam-monorepo/domain";

const schema = z.object({
  transactionId: z.cuid(),
  value: z.coerce.number().int(),
  description: z.string().trim().max(512).optional(),
});

export const updateSilcTransaction = createAuthenticatedAction(
  "updateSilcTransaction",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize(
        "silcTransactionOfOtherCitizen",
        "update",
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
     * Update transaction
     */
    const existingTransaction = await prisma.silcTransaction.findUnique({
      where: {
        id: data.transactionId,
      },
      select: {
        id: true,
        value: true,
        description: true,
        receiverId: true,
        deletedAt: true,
      },
    });
    if (!existingTransaction || existingTransaction.deletedAt)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const updatedById = authentication.session.entity.id;
    const updatedTransaction = await prisma.$transaction(
      async (transaction) => {
        const updated = await transaction.silcTransaction.update({
          where: {
            id: data.transactionId,
          },
          data: {
            value: data.value,
            description: data.description,
            updatedAt: new Date(),
            updatedBy: {
              connect: {
                id: updatedById,
              },
            },
          },
        });

        /** The balance changes in the same transaction as the ledger */
        await updateSilcBalances(transaction, [updated.receiverId]);

        return updated;
      },
    );

    await createAuditEvents([
      {
        type: AuditEventType.SILC_TRANSACTION_UPDATED,
        data: {
          transactionId: updatedTransaction.id,
          previousValue: existingTransaction.value ?? updatedTransaction.value,
          newValue: updatedTransaction.value,
          previousDescription:
            existingTransaction.description ?? updatedTransaction.description,
          newDescription: updatedTransaction.description,
          receiverId: updatedTransaction.receiverId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/silc");
    revalidatePath("/app/silc/transactions");
    revalidatePath("/app/dashboard");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      transactionId: formData.get("transactionId"),
      value: formData.get("value"),
      description: formData.has("description")
        ? formData.get("description")
        : undefined,
    }),
  },
);
