import {
  findTaskCreatedRecipients,
  TaskCreatedRecipientKind,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Task } from "@sam-monorepo/database";
import {
  getTaskAssignmentUpdatedText,
  getTaskCreatedText,
} from "@sam-monorepo/domain";
import { type Notification } from "../notification";
import { publishNotifications } from "../publish";

interface Payload {
  taskIds: Task["id"][];
}

export const TaskCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const groups = await findTaskCreatedRecipients(context, {
    taskIds: payload.taskIds,
  });

  const notifications = groups.flatMap(
    ({ task, kind, recipients }): Notification[] => {
      const notificationPayload = { taskId: task.id, taskTitle: task.title };

      switch (kind) {
        case TaskCreatedRecipientKind.PublicTask:
          return recipients.map((recipient) => ({
            receiverId: recipient.citizenId,
            notificationType: "task_created",
            payload: notificationPayload,
            ...getTaskCreatedText(notificationPayload),
            url: `/app/tasks/${task.id}`,
          }));

        case TaskCreatedRecipientKind.Assignee:
          return recipients.map((recipient) => ({
            receiverId: recipient.citizenId,
            notificationType: "task_assignment_updated",
            payload: notificationPayload,
            ...getTaskAssignmentUpdatedText(notificationPayload),
            url: `/app/tasks/${task.id}`,
          }));

        default:
          throw new Error(`Unknown recipient kind: ${kind satisfies never}`);
      }
    },
  );

  await publishNotifications(context, notifications);
};
