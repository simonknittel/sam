import {
  findTaskCompletedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Task } from "@sam-monorepo/database";
import { getTaskCompletedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  taskId: Task["id"];
}

export const TaskCompletedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findTaskCompletedRecipients(context, {
    taskId: payload.taskId,
  });
  if (!result) return;

  const notificationPayload = {
    taskId: result.task.id,
    taskTitle: result.task.title,
    citizenHandle: result.citizenHandle,
  };
  const text = getTaskCompletedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "task_completed" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/tasks/${result.task.id}`,
    })),
  );
};
