import { AuditEventType } from "@sam-monorepo/domain";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { markAnnouncedItemsAsRead } from "../readMarkers/announcements.js";

export interface MarkAllOnSiteNotificationsReadOutput {
  /** The number of notifications that were unread before */
  readonly count: number;
  /**
   * Whether one of the notifications announced an item which was new for the
   * actor. The items are read now.
   */
  readonly new_items_read: boolean;
}

/**
 * Marks all unread notifications of the inbox as read. The archive does not
 * change. The notifications which announce new items also mark their items
 * as read.
 *
 * @throws ForbiddenError for a user without a citizen
 */
export const markAllOnSiteNotificationsRead = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<MarkAllOnSiteNotificationsReadOutput> => {
  const citizenId = requireCitizen(actor).id;

  const notifications =
    await context.prisma.onSiteNotification.updateManyAndReturn({
      where: {
        citizenId,
        readAt: null,
        archivedAt: null,
      },
      data: {
        readAt: context.now(),
      },
      select: {
        notificationType: true,
        payload: true,
        payloadVersion: true,
      },
    });

  if (notifications.length > 0)
    await context.audit.create([
      {
        type: AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ,
        data: {
          citizenId,
          count: notifications.length,
        },
        createdById: actor.userId,
      },
    ]);

  const newItems = await markAnnouncedItemsAsRead(
    context,
    actor,
    notifications,
  );

  return {
    count: notifications.length,
    new_items_read: newItems.length > 0,
  };
};
