"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCitizensSilcBalances } from "../utils/updateCitizensSilcBalances";

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
    const deletedEntry = await prisma.silcTransaction.update({
      where: {
        id: data.id,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
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
     * Update citizens' balances
     */
    await updateCitizensSilcBalances([deletedEntry.receiverId]);

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
