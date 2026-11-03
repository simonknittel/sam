import {
  findTaskCancelledRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Task } from "@sam-monorepo/database";
import { getTaskCancelledText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  taskId: Task["id"];
}

export const TaskCancelledHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findTaskCancelledRecipients(context, {
    taskId: payload.taskId,
  });
  if (!result) return;

  const notificationPayload = {
    taskId: result.task.id,
    taskTitle: result.task.title,
  };
  const text = getTaskCancelledText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "task_cancelled" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/tasks/${result.task.id}`,
    })),
  );
};
