import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getMyWebPushSubscriptionCount = cache(
  withTrace("getMyWebPushSubscriptionCount", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) return 0;

    return prisma.webPushSubscription.count({
      where: {
        citizenId: authentication.session.entity.id,
      },
    });
  }),
);
