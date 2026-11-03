import {
  findTaskDeadlineReminderRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Task } from "@sam-monorepo/database";
import { getTaskDeadlineReminderText } from "@sam-monorepo/domain";
import { getTimeToLiveUntil, publishNotifications } from "../publish";

interface Payload {
  taskId: Task["id"];
}

export const TaskDeadlineReminderHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findTaskDeadlineReminderRecipients(context, {
    taskId: payload.taskId,
  });
  if (!result) return;

  const notificationPayload = {
    taskId: result.task.id,
    taskTitle: result.task.title,
    expiresAt: result.task.expiresAt.toISOString(),
  };
  const text = getTaskDeadlineReminderText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "task_deadline_reminder" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/tasks/${result.task.id}`,
    })),
    {
      // A reminder that arrives after the expiry of the task has no use
      TTL: getTimeToLiveUntil(context, result.task.expiresAt),
    },
  );
};
