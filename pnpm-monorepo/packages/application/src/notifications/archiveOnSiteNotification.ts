import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { markOwnNotificationsAsRead } from "./markOwnNotificationsAsRead.js";

export const archiveOnSiteNotificationInputSchema = z.object({
  notification_id: idSchema,
});

export type ArchiveOnSiteNotificationInput = z.output<
  typeof archiveOnSiteNotificationInputSchema
>;

export interface ArchiveOnSiteNotificationOutput {
  readonly notification_id: string;
  /**
   * False when the notification is not an own notification or is archived
   * already
   */
  readonly changed: boolean;
  /**
   * Whether the notification was unread and announced an item which was new
   * for the actor. The item is read now.
   */
  readonly new_item_read: boolean;
}

export const archiveOnSiteNotification = async (
  context: ApplicationContext,
  actor: Actor,
  input: ArchiveOnSiteNotificationInput,
): Promise<ArchiveOnSiteNotificationOutput> => {
  const citizenId = requireCitizen(actor).id;

  const { count } = await context.prisma.onSiteNotification.updateMany({
    where: {
      id: input.notification_id,
      citizenId,
      archivedAt: null,
    },
    data: {
      archivedAt: context.now(),
    },
  });
  if (count === 0)
    return {
      notification_id: input.notification_id,
      changed: false,
      new_item_read: false,
    };

  await context.audit.create([
    {
      type: AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED,
      data: {
        citizenId,
        notificationId: input.notification_id,
      },
      createdById: actor.userId,
    },
  ]);

  const { newItemRead } = await markOwnNotificationsAsRead(
    context,
    actor,
    { id: input.notification_id },
    (readerCitizenId, readCount) => ({
      type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
      data: { citizenId: readerCitizenId, count: readCount },
      createdById: actor.userId,
    }),
  );

  return {
    notification_id: input.notification_id,
    changed: true,
    new_item_read: newItemRead,
  };
};
