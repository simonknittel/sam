import type { ApplicationContext } from "../context.js";
import { getRunWindow } from "../frequentAutomations.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { getOpenTasksWhere } from "./taskWhere.js";

/** The time between the reminder and the expiry of the task */
const REMINDER_HOURS_BEFORE_EXPIRY = 24;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

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
    const tasks = await context.prisma.task.findMany({
      where: {
        AND: [
          getOpenTasksWhere(now),
          {
            expiresAt: getRunWindow(
              now,
              REMINDER_HOURS_BEFORE_EXPIRY * MILLISECONDS_PER_HOUR,
            ),
            // Only the assignees get the reminder
            assignments: { some: {} },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      tasks.map((task) => ({
        type: "TaskDeadlineReminder",
        payload: { taskId: task.id },
      })),
    );

    return { taskCount: tasks.length, notificationsSent };
  });
