import {
  addDaysToLocalDate,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import {
  getOrganizationInstant,
  isFirstRunAfterWallTime,
} from "../frequentAutomations.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";

/**
 * The wall time ("HH:mm") of the reminders in the time zone of the
 * organization. The reminders of a day are for the events that start from
 * this wall time of the day until this wall time of the next day (not
 * included). Thus each start time is in the window of exactly one day, and no
 * event of the window starts before its reminder.
 */
const REMINDER_WALL_TIME = "07:30";

export interface SendEventMorningRemindersOutput {
  /** True only for the run of the day that sends the reminders */
  readonly isReminderRun: boolean;
  /** The events (from the app and from Discord) of the reminders */
  readonly eventCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Requests the `EventMorningReminder` notification of each event with an
 * active participant that starts in the window of today (see
 * `REMINDER_WALL_TIME`). Only the first run after the reminder time sends
 * them, the other runs of the day do nothing.
 */
export const sendEventMorningReminders = (
  context: ApplicationContext,
): Promise<SendEventMorningRemindersOutput> =>
  withSpan(context, "sendEventMorningReminders", async () => {
    const now = context.now();
    if (!isFirstRunAfterWallTime(now, REMINDER_WALL_TIME))
      return { isReminderRun: false, eventCount: 0, notificationsSent: true };

    const today = getLocalDate(now, ORGANIZATION_TIMEZONE);
    const events = await context.prisma.event.findMany({
      where: {
        startTime: {
          gte: getOrganizationInstant(today, REMINDER_WALL_TIME),
          lt: getOrganizationInstant(
            addDaysToLocalDate(today, 1),
            REMINDER_WALL_TIME,
          ),
        },
        deletedAt: null,
        participants: { some: { cancelledAt: null } },
      },
      select: {
        id: true,
      },
    });

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      events.map((event) => ({
        type: "EventMorningReminder",
        payload: { eventId: event.id },
      })),
    );

    return {
      isReminderRun: true,
      eventCount: events.length,
      notificationsSent,
    };
  });
