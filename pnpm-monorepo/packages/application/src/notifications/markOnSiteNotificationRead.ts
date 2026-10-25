import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { markOwnNotificationsAsRead } from "./markOwnNotificationsAsRead.js";

export const markOnSiteNotificationReadInputSchema = z.object({
  notification_id: idSchema,
});

export type MarkOnSiteNotificationReadInput = z.output<
  typeof markOnSiteNotificationReadInputSchema
>;

export interface MarkOnSiteNotificationReadOutput {
  readonly notification_id: string;
  /** False when the notification is not an own notification or is read already */
  readonly changed: boolean;
  /**
   * Whether the notification announced an item which was new for the actor.
   * The item is read now.
   */
  readonly new_item_read: boolean;
}

/**
 * Marks an own notification as read. A notification which announces a new
 * item also marks its item as read.
 *
 * @throws ForbiddenError for a user without a citizen
 */
export const markOnSiteNotificationRead = async (
  context: ApplicationContext,
  actor: Actor,
  input: MarkOnSiteNotificationReadInput,
): Promise<MarkOnSiteNotificationReadOutput> => {
  const { count, newItemRead } = await markOwnNotificationsAsRead(
    context,
    actor,
    { id: input.notification_id },
    (citizenId, readCount) => ({
      type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
      data: { citizenId, count: readCount },
      createdById: actor.userId,
    }),
  );

  return {
    notification_id: input.notification_id,
    changed: count > 0,
    new_item_read: newItemRead,
  };
};
