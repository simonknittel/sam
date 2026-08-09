"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
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

    await prisma.onSiteNotification.updateMany({
      where: {
        citizenId: authentication.session.entity.id,
        readAt: null,
        archivedAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: "Alle als gelesen markiert" };
  },
);
