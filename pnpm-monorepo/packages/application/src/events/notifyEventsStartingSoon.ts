import type { ApplicationContext } from "../context.js";
import { FREQUENT_AUTOMATIONS_INTERVAL_MILLISECONDS } from "../frequentAutomations.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";

export interface NotifyEventsStartingSoonOutput {
  /** The events (from the app and from Discord) that start soon */
  readonly eventCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Requests the `EventStarting` notification of each event that starts soon:
 * from now until one run interval after now, thus before the next run
 */
export const notifyEventsStartingSoon = (
  context: ApplicationContext,
): Promise<NotifyEventsStartingSoonOutput> =>
  withSpan(context, "notifyEventsStartingSoon", async () => {
    const now = context.now();
    const events = await context.prisma.event.findMany({
      where: {
        startTime: {
          gte: now,
          lte: new Date(
            now.getTime() + FREQUENT_AUTOMATIONS_INTERVAL_MILLISECONDS,
          ),
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      events.map((event) => ({
        type: "EventStarting",
        payload: { eventId: event.id },
      })),
    );

    return { eventCount: events.length, notificationsSent };
  });
