"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
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

    await prisma.onSiteNotification.updateMany({
      where: {
        id: { in: data.notificationIds },
        citizenId: authentication.session.entity.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: "Als gelesen markiert" };
  },
  {
    parseFormData: (formData) => ({
      notificationIds: formData.getAll("notificationId"),
    }),
  },
);
