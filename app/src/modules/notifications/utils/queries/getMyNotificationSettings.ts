import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getMyNotificationSettings = cache(
  withTrace("getMyNotificationSettings", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) return null;

    return prisma.notificationSetting.findMany({
      where: {
        citizenId: authentication.session.entity.id,
      },
    });
  }),
);
