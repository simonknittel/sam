import {
  findTaskAcceptedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Task } from "@sam-monorepo/database";
import { getTaskAcceptedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  taskId: Task["id"];
  citizenId: Citizen["id"];
}

export const TaskAcceptedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findTaskAcceptedRecipients(context, {
    taskId: payload.taskId,
    citizenId: payload.citizenId,
  });
  if (!result) return;

  const notificationPayload = {
    taskId: result.task.id,
    taskTitle: result.task.title,
    citizenHandle: result.citizenHandle,
  };
  const text = getTaskAcceptedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "task_accepted" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/tasks/${result.task.id}`,
    })),
  );
};
