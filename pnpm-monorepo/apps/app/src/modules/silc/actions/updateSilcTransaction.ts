"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { lockSilcLedger, updateSilcBalances } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";
import { MAX_SILC_VALUE } from "../utils/silcValueLimit";

const schema = z.object({
  transactionId: z.cuid(),
  value: z.coerce.number().int().min(-MAX_SILC_VALUE).max(MAX_SILC_VALUE),
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
     * Update the transaction. It is read after the ledger lock, thus a
     * parallel delete or update cannot come between the read and the write.
     */
    const updatedById = authentication.session.entity.id;
    const result = await prisma.$transaction(async (transaction) => {
      await lockSilcLedger(transaction);

      const existingTransaction = await transaction.silcTransaction.findFirst({
        where: {
          id: data.transactionId,
          deletedAt: null,
        },
        select: {
          value: true,
          description: true,
        },
      });
      if (!existingTransaction) return null;

      const updated = await transaction.silcTransaction.update({
        where: {
          id: data.transactionId,
        },
        data: {
          value: data.value,
          description: data.description,
          updatedAt: new Date(),
          updatedById,
        },
        select: {
          id: true,
          receiverId: true,
          value: true,
          description: true,
        },
      });

      /** The balance changes in the same transaction as the ledger */
      await updateSilcBalances(transaction, [updated.receiverId]);

      return { existingTransaction, updatedTransaction: updated };
    });
    if (!result)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    const { existingTransaction, updatedTransaction } = result;

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

    refresh();

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
