"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";
import {
  areActiveReceivers,
  INACTIVE_RECEIVER_ERROR,
} from "../utils/activeReceivers";
import {
  announceSilcTransactions,
  createSilcTransactionsInTransaction,
} from "../utils/createSilcTransactions";
import { MAX_SILC_VALUE } from "../utils/silcValueLimit";

const schema = z.object({
  receiverIds: z.array(z.string().trim().cuid()).min(1).max(250), // Arbitrary (untested) limit to prevent DDoS
  value: z.coerce.number().int().min(-MAX_SILC_VALUE).max(MAX_SILC_VALUE),
  description: z.string().trim().max(512).optional(),
});

export const createSilcTransaction = createAuthenticatedAction(
  "createSilcTransaction",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize(
        "silcTransactionOfOtherCitizen",
        "create",
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
    if (!(await areActiveReceivers(data.receiverIds))) {
      /** A different user deleted a receiver, and the page must show it */
      refresh();
      return {
        error: INACTIVE_RECEIVER_ERROR,
        requestPayload: formData,
      };
    }

    /**
     * Create transaction
     */
    const createdById = authentication.session.entity.id;
    const transactionIds = await prisma.$transaction((transaction) =>
      createSilcTransactionsInTransaction(
        transaction,
        data.receiverIds.map((receiverId) => ({
          receiverId,
          value: data.value,
          description: data.description,
          createdById,
        })),
      ),
    );

    refresh();

    await announceSilcTransactions(transactionIds);

    await createAuditEvents([
      {
        type: AuditEventType.SILC_TRANSACTION_CREATED,
        data: {
          transactionIds,
          receiverIds: data.receiverIds,
          value: data.value,
          description: data.description,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  },
  {
    parseFormData: (formData) => ({
      receiverIds: formData.getAll("receiverId[]"),
      value: formData.get("value"),
      description: formData.has("description")
        ? formData.get("description")
        : undefined,
    }),
  },
);
