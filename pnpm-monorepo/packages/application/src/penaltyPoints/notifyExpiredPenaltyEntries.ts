import type { ApplicationContext } from "../context.js";
import {
  FREQUENT_AUTOMATIONS_INTERVAL_MILLISECONDS,
  getRunWindow,
} from "../frequentAutomations.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";

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
    const penaltyEntries = await context.prisma.penaltyEntry.findMany({
      where: {
        expiresAt: getRunWindow(
          context.now(),
          -FREQUENT_AUTOMATIONS_INTERVAL_MILLISECONDS,
        ),
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      penaltyEntries.map((penaltyEntry) => ({
        type: "PenaltyEntryExpired",
        payload: { penaltyEntryId: penaltyEntry.id },
      })),
    );

    return { penaltyEntryCount: penaltyEntries.length, notificationsSent };
  });
