import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";

export const markOnSiteNotificationUnreadInputSchema = z.object({
  notification_id: idSchema,
});

export type MarkOnSiteNotificationUnreadInput = z.output<
  typeof markOnSiteNotificationUnreadInputSchema
>;

export interface MarkOnSiteNotificationUnreadOutput {
  readonly notification_id: string;
  /**
   * False when the notification is not an own notification or is unread
   * already
   */
  readonly changed: boolean;
}

/**
 * Marks an own notification as unread
 *
 * @throws ForbiddenError for a user without a citizen
 */
export const markOnSiteNotificationUnread = async (
  context: ApplicationContext,
  actor: Actor,
  input: MarkOnSiteNotificationUnreadInput,
): Promise<MarkOnSiteNotificationUnreadOutput> => {
  const citizenId = requireCitizen(actor).id;

  const { count } = await context.prisma.onSiteNotification.updateMany({
    where: {
      id: input.notification_id,
      citizenId,
      readAt: { not: null },
    },
    data: {
      readAt: null,
    },
  });

  if (count > 0)
    await context.audit.create([
      {
        type: AuditEventType.ON_SITE_NOTIFICATION_UNREAD,
        data: {
          citizenId,
          notificationId: input.notification_id,
        },
        createdById: actor.userId,
      },
    ]);

  return { notification_id: input.notification_id, changed: count > 0 };
};
