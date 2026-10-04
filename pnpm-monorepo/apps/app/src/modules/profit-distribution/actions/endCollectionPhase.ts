"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { announceSilcTransactions } from "@/modules/silc/utils/createSilcTransactions";
import { endCollectionPhaseInTransaction } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid2(),
});

export const endCollectionPhase = createAuthenticatedAction(
  "endCollectionPhase",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!(await authentication.authorize("profitDistributionCycle", "update")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * End the phase. The guarded update in the transaction also validates
     * that the cycle exists and is in its collection phase.
     */
    const endedById = authentication.session.entity.id;
    const transactionIds = await prisma.$transaction((transaction) =>
      endCollectionPhaseInTransaction(transaction, {
        cycleId: data.id,
        endedById,
        endedAt: new Date(),
      }),
    );

    /**
     * Also for the error below: then a different tab, a different manager or
     * the midnight job ended the phase before, and the page must show it.
     */
    refresh();

    if (transactionIds === null)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
        data: {
          cycleId: data.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    await announceSilcTransactions(transactionIds);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
