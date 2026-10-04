"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { lockSilcLedger, updateSilcBalances } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
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
     * (Soft-)delete the transaction. The claim after the ledger lock makes a
     * parallel second delete change nothing.
     */
    const deletedById = authentication.session.entity.id;
    const deletedEntry = await prisma.$transaction(async (transaction) => {
      await lockSilcLedger(transaction);

      const [entry] = await transaction.silcTransaction.updateManyAndReturn({
        where: {
          id: data.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedById,
        },
        select: {
          id: true,
          receiverId: true,
          value: true,
          description: true,
        },
      });
      if (!entry) return null;

      /** The balance changes in the same transaction as the ledger */
      await updateSilcBalances(transaction, [entry.receiverId]);

      return entry;
    });

    /**
     * Also for the error below: then a different tab or user deleted the
     * transaction before, and the page must show it.
     */
    refresh();

    if (!deletedEntry)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

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
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
