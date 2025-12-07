import { prisma, type Task } from "@sam-monorepo/database";
import { publishWebPushNotifications } from "../web-push";

interface Payload {
  taskIds: Task["id"][];
}

export const TaskCreatedHandler = async (payload: Payload) => {
  // TODO: Only send notifications to citizens which have the `login;manage` and `task;read` permission

  const tasks = await prisma.task.findMany({
    where: {
      id: {
        in: payload.taskIds,
      },
    },
    select: {
      id: true,
      title: true,
      assignments: {
        select: {
          citizenId: true,
        },
      },
    },
  });
  if (tasks.length <= 0) return;

  /**
   * Publish notifications
   */
  await publishWebPushNotifications(
    tasks.flatMap((task) =>
      task.assignments.map((assignment) => ({
        receiverId: assignment.citizenId,
        notificationType: "task_assignment_updated",
        title: "Neuer Task",
        body: `Dir wurde ein Task zugewiesen: ${task.title}`,
        url: `/app/tasks/${task.id}`,
      })),
    ),
  );
};
