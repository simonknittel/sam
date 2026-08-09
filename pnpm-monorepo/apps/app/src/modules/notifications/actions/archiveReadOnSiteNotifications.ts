"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
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

    await prisma.onSiteNotification.updateMany({
      where: {
        citizenId: authentication.session.entity.id,
        readAt: { not: null },
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    return { success: "Gelesene archiviert" };
  },
);
