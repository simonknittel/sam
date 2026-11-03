import {
  AuditEventType,
  type OnSiteNotificationType,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

/**
 * How long a notification of a given type stays relevant after it was
 * created. Types without an entry stay in the inbox until the citizen
 * archives them; only list a type here whose notification says nothing worth
 * acting on once its window has passed.
 *
 * `event_starting` goes out 15 minutes before the event starts (see the
 * frequent automation of the same name), so it is obsolete the moment the
 * event begins. `event_morning_reminder` goes out at 07:30 for the events
 * that start before 07:30 of the next day (see
 * `sendEventMorningReminders()`), so it is obsolete after one day.
 * `task_deadline_reminder` goes out one day before the task expires, and
 * `sincome_payout_reminder` on the morning of the last day of the payout
 * phase (see `sendSincomePayoutReminders()`), thus they are obsolete after
 * one day.
 */
const RELEVANCE_MINUTES_BY_TYPE = {
  event_starting: 15,
  event_morning_reminder: 24 * 60,
  task_deadline_reminder: 24 * 60,
  sincome_payout_reminder: 24 * 60,
} as const satisfies Partial<Record<OnSiteNotificationType, number>>;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export interface ArchiveIrrelevantOnSiteNotificationsOutput {
  readonly archivedCount: number;
}

/**
 * Archives the on-site notifications after their time of relevance. They
 * leave the inbox and the unread count, but their read state does not
 * change: the citizen can find them in the archive and restore them.
 *
 * The job runs one time each day, thus a notification can stay in the inbox
 * up to one day too long. Such a notification is old, but it causes no
 * problem. A browser that shows it keeps it until its next read.
 */
export const archiveIrrelevantOnSiteNotifications = (
  context: ApplicationContext,
): Promise<ArchiveIrrelevantOnSiteNotificationsOutput> =>
  withSpan(context, "archiveIrrelevantOnSiteNotifications", async () => {
    const now = context.now();

    const { count: archivedCount } =
      await context.prisma.onSiteNotification.updateMany({
        where: {
          archivedAt: null,
          OR: Object.entries(RELEVANCE_MINUTES_BY_TYPE).map(
            ([notificationType, relevanceMinutes]) => ({
              notificationType,
              createdAt: {
                lt: new Date(
                  now.getTime() - relevanceMinutes * MILLISECONDS_PER_MINUTE,
                ),
              },
            }),
          ),
        },
        data: {
          archivedAt: now,
        },
      });

    if (archivedCount > 0)
      await context.audit.create([
        {
          type: AuditEventType.IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED,
          data: { count: archivedCount },
          createdById: null,
        },
      ]);

    return { archivedCount };
  });
