"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({});

export const markAllOnSiteNotificationsRead = createAuthenticatedAction(
  "markAllOnSiteNotificationsRead",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const { count } = await prisma.onSiteNotification.updateMany({
      where: {
        citizenId: authentication.session.entity.id,
        readAt: null,
        archivedAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    if (count > 0)
      await createAuditEvents([
        {
          type: AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ,
          data: {
            citizenId: authentication.session.entity.id,
            count,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    return { success: "Alle als gelesen markiert" };
  },
);
