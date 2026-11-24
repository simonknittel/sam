import { AuditEventType } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { markOwnNotificationsAsRead } from "./markOwnNotificationsAsRead.js";

export interface MarkAllOnSiteNotificationsReadOutput {
  readonly count: number;
  /**
   * Whether one of the notifications announced an item which was new for the
   * actor. The items are read now.
   */
  readonly new_items_read: boolean;
}

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
