import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { getOpenTasksWhere } from "./taskWhere.js";

/** The time between the reminder and the expiry of the task */
const REMINDER_HOURS_BEFORE_EXPIRY = 24;

/**
 * The interval of the schedule of `frequent-automations`: thus the windows
 * of the runs follow each other, and each expiry is in the window of exactly
 * one run.
 */
const RUN_INTERVAL_MINUTES = 15;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;

export interface SendTaskDeadlineRemindersOutput {
  /** The open tasks with assignees that expire in the window of the run */
  readonly taskCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Requests the `TaskDeadlineReminder` notification of each open task with
 * assignees that expires in 24 hours: from 24 hours after now until 24 hours
 * and one run interval after now (not included).
 */
export const sendTaskDeadlineReminders = (
  context: ApplicationContext,
): Promise<SendTaskDeadlineRemindersOutput> =>
  withSpan(context, "sendTaskDeadlineReminders", async () => {
    const now = context.now();
    const windowStart = new Date(
      now.getTime() + REMINDER_HOURS_BEFORE_EXPIRY * MILLISECONDS_PER_HOUR,
    );
    const windowEnd = new Date(
      windowStart.getTime() + RUN_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE,
    );

    const tasks = await context.prisma.task.findMany({
      where: {
        AND: [
          getOpenTasksWhere(now),
          {
            expiresAt: { gte: windowStart, lt: windowEnd },
            // Only the assignees get the reminder
            assignments: { some: {} },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    if (tasks.length <= 0) return { taskCount: 0, notificationsSent: true };

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      tasks.map((task) => ({
        type: "TaskDeadlineReminder",
        payload: { taskId: task.id },
      })),
    );

    return { taskCount: tasks.length, notificationsSent };
  });
