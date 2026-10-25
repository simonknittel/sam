// A notification which announces a new item (see `announcement` of the
// subject rules) and the read marker of the item are one read state: the read
// of the one marks the other as read. Only the rows of the current payload
// version of the notification type take part.

import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS,
  parseOnSiteNotificationPayload,
  ReadMarkerSubject,
} from "@sam-monorepo/domain";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { READ_MARKER_SUBJECT_RULES } from "./readMarkerSubjects.js";
import {
  markReadableItemsAsRead,
  type ReadMarkerItem,
} from "./writeReadMarkers.js";

/** The fields of a stored on-site notification which name its item */
interface NotificationContent {
  readonly notificationType: string;
  readonly payload: unknown;
  readonly payloadVersion: number;
}

const findAnnouncedItem = (
  notification: NotificationContent,
): ReadMarkerItem | null => {
  const parsed = parseOnSiteNotificationPayload(notification);
  if (!parsed) return null;

  for (const subject of Object.values(ReadMarkerSubject)) {
    const announcement = READ_MARKER_SUBJECT_RULES[subject].announcement;
    if (announcement?.notificationType !== parsed.notificationType) continue;

    const payload: Readonly<Record<string, unknown>> = parsed.payload;
    const subjectId = payload[announcement.subjectIdKey];
    return typeof subjectId === "string" ? { subject, subjectId } : null;
  }

  return null;
};

/**
 * Marks the items which the notifications announce as read by the actor. The
 * caller has marked the notifications as read.
 *
 * @returns the announced items which were new for the actor
 */
export const markAnnouncedItemsAsRead = async (
  context: ApplicationContext,
  actor: Actor,
  notifications: readonly NotificationContent[],
): Promise<ReadMarkerItem[]> => {
  const items = notifications.flatMap(
    (notification) => findAnnouncedItem(notification) ?? [],
  );
  if (items.length === 0) return [];

  return (await markReadableItemsAsRead(context, actor, items)).newItems;
};

/**
 * Marks the unread notifications of the actor which announce the items as
 * read, also the archived ones. The caller has marked the items as read.
 *
 * @returns the number of notifications which were unread
 */
export const markAnnouncementsAsRead = async (
  context: ApplicationContext,
  actor: Actor,
  items: readonly ReadMarkerItem[],
): Promise<number> => {
  const citizenId = requireCitizen(actor).id;

  const announcementFilters = items.flatMap(
    (item): Prisma.OnSiteNotificationWhereInput[] => {
      const announcement = READ_MARKER_SUBJECT_RULES[item.subject].announcement;
      if (!announcement) return [];

      return [
        {
          notificationType: announcement.notificationType,
          payloadVersion:
            ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS[
              announcement.notificationType
            ],
          payload: {
            path: [announcement.subjectIdKey],
            equals: item.subjectId,
          },
        },
      ];
    },
  );
  if (announcementFilters.length === 0) return 0;

  const { count } = await context.prisma.onSiteNotification.updateMany({
    where: { citizenId, readAt: null, OR: announcementFilters },
    data: { readAt: context.now() },
  });

  if (count > 0)
    await context.audit.create([
      {
        type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
        data: { citizenId, count },
        createdById: actor.userId,
      },
    ]);

  return count;
};
