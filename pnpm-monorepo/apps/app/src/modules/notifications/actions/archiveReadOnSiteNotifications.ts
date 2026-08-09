"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({});

export const archiveReadOnSiteNotifications = createAuthenticatedAction(
  "archiveReadOnSiteNotifications",
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
        readAt: { not: null },
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    if (count > 0)
      await createAuditEvents([
        {
          type: AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED,
          data: {
            citizenId: authentication.session.entity.id,
            count,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    return { success: "Gelesene archiviert" };
  },
);
