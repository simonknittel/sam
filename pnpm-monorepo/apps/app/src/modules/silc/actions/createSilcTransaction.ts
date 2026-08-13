"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import { createSilcTransactions } from "../utils/createSilcTransactions";

const schema = z.object({
  receiverIds: z.array(z.string().trim().cuid()).min(1).max(250), // Arbitrary (untested) limit to prevent DDoS
  value: z.coerce.number().int(),
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

    /**
     * Create transaction
     */
    const transactionIds = await createSilcTransactions(
      data.receiverIds.map((receiverId) => ({
        receiverId,
        value: data.value,
        description: data.description,
        createdById: authentication.session.entity!.id,
      })),
    );

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
