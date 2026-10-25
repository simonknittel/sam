import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { markAnnouncedItemsAsRead } from "../readMarkers/announcements.js";

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
  const citizenId = requireCitizen(actor).id;

  const notifications =
    await context.prisma.onSiteNotification.updateManyAndReturn({
      where: {
        id: input.notification_id,
        citizenId,
        readAt: null,
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
        type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
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
    notification_id: input.notification_id,
    changed: notifications.length > 0,
    new_item_read: newItems.length > 0,
  };
};
