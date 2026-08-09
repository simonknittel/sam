"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({
  notificationId: z.cuid2(),
});

export const unarchiveOnSiteNotification = createAuthenticatedAction(
  "unarchiveOnSiteNotification",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const { count } = await prisma.onSiteNotification.updateMany({
      where: {
        id: data.notificationId,
        citizenId: authentication.session.entity.id,
        archivedAt: { not: null },
      },
      data: {
        archivedAt: null,
      },
    });

    if (count > 0)
      await createAuditEvents([
        {
          type: AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED,
          data: {
            citizenId: authentication.session.entity.id,
            notificationId: data.notificationId,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    return { success: "Wiederhergestellt" };
  },
);
