import { prisma } from "@sam-monorepo/database";
import { type OnSiteNotificationType } from "@sam-monorepo/notifications";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

/**
 * How long a notification of a given type stays relevant after it was
 * created. Types without an entry stay in the inbox until the citizen
 * archives them; only list a type here whose notification says nothing worth
 * acting on once its window has passed.
 *
 * `event_starting` goes out 15 minutes before the event starts (see the
 * frequent automation of the same name), so it is obsolete the moment the
 * event begins.
 */
const RELEVANCE_MINUTES_BY_TYPE = {
  event_starting: 15,
} as const satisfies Partial<Record<OnSiteNotificationType, number>>;

/**
 * Archives on-site notifications whose relevance window has passed, taking
 * them out of the inbox and the unread badge without touching their read
 * state — the citizen can still find (and unarchive) them in the archive.
 *
 * Running once a day means they outlive their window by up to a day; they
 * are merely stale, not harmful, and a browser that has one open keeps
 * showing it until the next fetch.
 */
export const archiveIrrelevantOnSiteNotifications = async () => {
  await captureAsyncFunc("archiveIrrelevantOnSiteNotifications", async () => {
    const now = Date.now();

    const result = await prisma.onSiteNotification.updateMany({
      where: {
        archivedAt: null,
        OR: Object.entries(RELEVANCE_MINUTES_BY_TYPE).map(
          ([notificationType, relevanceMinutes]) => ({
            notificationType,
            createdAt: { lt: new Date(now - relevanceMinutes * 60 * 1000) },
          }),
        ),
      },
      data: {
        archivedAt: new Date(),
      },
    });

    if (result.count > 0) {
      log.info("Archived irrelevant on-site notifications", {
        count: result.count,
      });

      await createAuditEvents([
        {
          type: "IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED",
          data: { count: result.count },
        },
      ]);
    }
  });
};
