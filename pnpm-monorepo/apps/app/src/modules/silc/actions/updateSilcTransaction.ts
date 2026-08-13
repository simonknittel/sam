"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCitizensSilcBalances } from "../utils/updateCitizensSilcBalances";

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

    const updatedTransaction = await prisma.silcTransaction.update({
      where: {
        id: data.transactionId,
      },
      data: {
        value: data.value,
        description: data.description,
        updatedAt: new Date(),
        updatedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
    });

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
     * Update citizens' balances
     */
    await updateCitizensSilcBalances([updatedTransaction.receiverId]);

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
