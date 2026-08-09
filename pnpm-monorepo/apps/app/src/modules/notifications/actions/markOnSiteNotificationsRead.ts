"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({
  notificationIds: z.array(z.cuid2()).min(1).max(100),
});

/**
 * Marks a batch of the citizen's own notifications as read. Called by the
 * read-on-view tracking of the notification center, hence the batch input.
 */
export const markOnSiteNotificationsRead = createAuthenticatedAction(
  "markOnSiteNotificationsRead",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const { count } = await prisma.onSiteNotification.updateMany({
      where: {
        id: { in: data.notificationIds },
        citizenId: authentication.session.entity.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    /** Read-on-view re-submits already-read ids; only real changes are logged */
    if (count > 0)
      await createAuditEvents([
        {
          type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
          data: {
            citizenId: authentication.session.entity.id,
            count,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    return { success: "Als gelesen markiert" };
  },
  {
    parseFormData: (formData) => ({
      notificationIds: formData.getAll("notificationId"),
    }),
  },
);
