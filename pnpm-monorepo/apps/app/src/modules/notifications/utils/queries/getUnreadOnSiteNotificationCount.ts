import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * Number of unread, unarchived on-site notifications of the current citizen.
 * Archiving an unread notification removes it from this count without
 * touching its read state.
 */
export const getUnreadOnSiteNotificationCount = cache(
  withTrace("getUnreadOnSiteNotificationCount", async () => {
    const authentication = await authenticate();
    if (!authentication || !authentication.session.entity) return 0;

    return prisma.onSiteNotification.count({
      where: {
        citizenId: authentication.session.entity.id,
        readAt: null,
        archivedAt: null,
      },
    });
  }),
);
