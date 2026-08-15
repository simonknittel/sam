"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({});

/**
 * Deletes all web push subscriptions of the citizen (all devices). The
 * browser-side permission can't be revoked from here, but without the stored
 * subscriptions no push notifications get delivered anymore.
 */
export const unsubscribeWebPush = createAuthenticatedAction(
  "unsubscribeWebPush",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const { count } = await prisma.webPushSubscription.deleteMany({
      where: {
        citizenId: authentication.session.entity.id,
      },
    });

    if (count > 0)
      await createAuditEvents([
        {
          type: AuditEventType.WEB_PUSH_UNSUBSCRIBED,
          data: {
            citizenId: authentication.session.entity.id,
            count,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    revalidatePath("/app/account/notifications");

    return {
      success: "Die Benachrichtigungen wurden auf allen Geräten deaktiviert.",
    };
  },
);
