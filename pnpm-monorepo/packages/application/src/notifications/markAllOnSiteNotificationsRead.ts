import { AuditEventType } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { markOwnNotificationsAsRead } from "./markOwnNotificationsAsRead.js";

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
  const { count, newItemRead } = await markOwnNotificationsAsRead(
    context,
    actor,
    { archivedAt: null },
    (citizenId, readCount) => ({
      type: AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ,
      data: { citizenId, count: readCount },
      createdById: actor.userId,
    }),
  );

  return { count, new_items_read: newItemRead };
};
