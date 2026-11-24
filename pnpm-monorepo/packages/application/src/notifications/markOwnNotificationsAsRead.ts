import type { Prisma } from "@sam-monorepo/database/client";
import type { AuditEventInput } from "@sam-monorepo/domain";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { markAnnouncedItemsAsRead } from "../readMarkers/announcements.js";

interface MarkedOwnNotifications {
  readonly count: number;
  readonly newItemRead: boolean;
}

/**
 * Also marks the items which the notifications announce. Each read that starts
 * from notifications goes through here, thus no read can forget the items. For
 * the read of an item, see `markAnnouncementsAsRead()`.
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
