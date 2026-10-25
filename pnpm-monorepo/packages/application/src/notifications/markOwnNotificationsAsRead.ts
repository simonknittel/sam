import type { Prisma } from "@sam-monorepo/database/client";
import type { AuditEventInput } from "@sam-monorepo/domain";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { markAnnouncedItemsAsRead } from "../readMarkers/announcements.js";

interface MarkedOwnNotifications {
  /** The number of notifications that were unread before */
  readonly count: number;
  /** Whether a notification announced an item which was new for the actor */
  readonly newItemRead: boolean;
}

/**
 * Marks the unread notifications of the actor which match the filter as
 * read, and also the items which they announce (see
 * `markAnnouncedItemsAsRead()`). Each read of notifications goes through
 * here, thus no read can forget the items.
 *
 * @param createAuditEvent the event of the read, only called for a change
 */
export const markOwnNotificationsAsRead = async (
  context: ApplicationContext,
  actor: Actor,
  where: Prisma.OnSiteNotificationWhereInput,
  createAuditEvent: (citizenId: string, count: number) => AuditEventInput,
): Promise<MarkedOwnNotifications> => {
  const citizenId = requireCitizen(actor).id;

  const notifications =
    await context.prisma.onSiteNotification.updateManyAndReturn({
      where: { ...where, citizenId, readAt: null },
      data: { readAt: context.now() },
      select: { notificationType: true, payload: true, payloadVersion: true },
    });
  if (notifications.length === 0) return { count: 0, newItemRead: false };

  await context.audit.create([
    createAuditEvent(citizenId, notifications.length),
  ]);

  return {
    count: notifications.length,
    newItemRead: await markAnnouncedItemsAsRead(context, actor, notifications),
  };
};
