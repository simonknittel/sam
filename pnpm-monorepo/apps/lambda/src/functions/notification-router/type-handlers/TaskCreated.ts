import { prisma, type Task } from "@sam-monorepo/database";
import { publishPusherNotification } from "../pusher";

interface Payload {
  taskIds: Task["id"][];
}

export const TaskCreatedHandler = async (payload: Payload) => {
  // TODO: Migrate to Novu
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
  const notifications = [];
  for (const task of tasks) {
    for (const assignment of task.assignments) {
      notifications.push(
        publishPusherNotification(
          [`task_assigned;citizen_id=${assignment.citizenId}`],
          "Dir wurde ein Task zugewiesen",
          task.title,
          `/app/tasks/${task.id}`,
        ),
      );
    }
  }
  if (notifications.length <= 0) return;

  await Promise.all(notifications);
};
