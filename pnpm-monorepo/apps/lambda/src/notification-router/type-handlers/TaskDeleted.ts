import {
  findTaskDeletedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Task } from "@sam-monorepo/database";
import { getTaskDeletedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  taskId: Task["id"];
}

export const TaskDeletedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findTaskDeletedRecipients(context, {
    taskId: payload.taskId,
  });
  if (!result) return;

  const notificationPayload = { taskTitle: result.task.title };
  const text = getTaskDeletedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "task_deleted" as const,
      payload: notificationPayload,
      ...text,
    })),
  );
};
