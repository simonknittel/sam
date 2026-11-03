import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";

/**
 * The interval of the schedule of `frequent-automations`: thus the expiry of
 * each entry is in the window of exactly one run.
 */
const RUN_INTERVAL_MINUTES = 15;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export interface NotifyExpiredPenaltyEntriesOutput {
  /** The entries that expired since the last run */
  readonly penaltyEntryCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Requests the `PenaltyEntryExpired` notification of each entry that is not
 * deleted and expired since the last run. An entry still counts at the time
 * of its expiry (see `buildActivePenaltyEntryWhere()`), thus the window does
 * not include now.
 */
export const notifyExpiredPenaltyEntries = (
  context: ApplicationContext,
): Promise<NotifyExpiredPenaltyEntriesOutput> =>
  withSpan(context, "notifyExpiredPenaltyEntries", async () => {
    const now = context.now();
    const penaltyEntries = await context.prisma.penaltyEntry.findMany({
      where: {
        expiresAt: {
          gte: new Date(
            now.getTime() - RUN_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE,
          ),
          lt: now,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (penaltyEntries.length <= 0)
      return { penaltyEntryCount: 0, notificationsSent: true };

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      penaltyEntries.map((penaltyEntry) => ({
        type: "PenaltyEntryExpired",
        payload: { penaltyEntryId: penaltyEntry.id },
      })),
    );

    return { penaltyEntryCount: penaltyEntries.length, notificationsSent };
  });
