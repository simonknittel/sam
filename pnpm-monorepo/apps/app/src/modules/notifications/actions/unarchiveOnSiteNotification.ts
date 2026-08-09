"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
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

    await prisma.onSiteNotification.updateMany({
      where: {
        id: data.notificationId,
        citizenId: authentication.session.entity.id,
        archivedAt: { not: null },
      },
      data: {
        archivedAt: null,
      },
    });

    return { success: "Wiederhergestellt" };
  },
);
