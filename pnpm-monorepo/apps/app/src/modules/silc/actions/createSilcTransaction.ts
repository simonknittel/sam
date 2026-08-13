"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCitizensSilcBalances } from "../utils/updateCitizensSilcBalances";

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
    const createdSilcTransactions =
      await prisma.silcTransaction.createManyAndReturn({
        data: data.receiverIds.map((receiverId) => ({
          receiverId,
          value: data.value,
          description: data.description,
          createdById: authentication.session.entity!.id,
        })),
        select: {
          id: true,
        },
      });

    await createAuditEvents([
      {
        type: AuditEventType.SILC_TRANSACTION_CREATED,
        data: {
          transactionIds: createdSilcTransactions.map(
            (transaction) => transaction.id,
          ),
          receiverIds: data.receiverIds,
          value: data.value,
          description: data.description,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Update citizens' balances
     */
    await updateCitizensSilcBalances(data.receiverIds);

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "SilcTransactionsCreated",
        payload: {
          transactionIds: createdSilcTransactions.map(
            (transaction) => transaction.id,
          ),
        },
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
