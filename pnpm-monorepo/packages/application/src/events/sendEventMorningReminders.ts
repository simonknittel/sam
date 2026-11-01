import {
  addDaysToLocalDate,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  toLocalDateKey,
  wallTimeToInstant,
  type LocalDate,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
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

/**
 * The interval of the schedule of `frequent-automations`: thus exactly one
 * run of a day starts in this interval after the reminder time.
 */
const RUN_INTERVAL_MINUTES = 15;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export interface SendEventMorningRemindersOutput {
  /** True only for the run of the day that sends the reminders */
  readonly isReminderRun: boolean;
  /** The events (from the app and from Discord) of the reminders */
  readonly eventCount: number;
  readonly notificationsSent: boolean;
}

const toInstant = (date: LocalDate, wallTime: string) =>
  wallTimeToInstant(
    `${toLocalDateKey(date)}T${wallTime}`,
    ORGANIZATION_TIMEZONE,
  );

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
    const today = getLocalDate(now, ORGANIZATION_TIMEZONE);
    const reminderTime = toInstant(today, REMINDER_WALL_TIME);
    const millisecondsSinceReminderTime =
      now.getTime() - reminderTime.getTime();
    if (
      millisecondsSinceReminderTime < 0 ||
      millisecondsSinceReminderTime >=
        RUN_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE
    )
      return { isReminderRun: false, eventCount: 0, notificationsSent: true };

    const events = await context.prisma.event.findMany({
      where: {
        startTime: {
          gte: reminderTime,
          lt: toInstant(addDaysToLocalDate(today, 1), REMINDER_WALL_TIME),
        },
        deletedAt: null,
        participants: { some: { cancelledAt: null } },
      },
      select: {
        id: true,
      },
    });
    if (events.length <= 0)
      return { isReminderRun: true, eventCount: 0, notificationsSent: true };

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
