import { prisma, type Task } from "@sam-monorepo/database";
import { publishPusherNotification } from "../pusher";

interface Payload {
  taskId: Task["id"];
}

export const TaskAssignmentUpdatedHandler = async (payload: Payload) => {
  // TODO: Migrate to Novu
  // TODO: Only notify newly assigned citizens
  // TODO: Only send notifications to citizens which have the `login;manage` and `task;read` permission

  const task = await prisma.task.findUnique({
    where: { id: payload.taskId },
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
  if (!task || task.assignments.length <= 0) return;

  /**
   * Publish notifications
   */
  const notifications = [];
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
  if (notifications.length <= 0) return;

  await Promise.all(notifications);
};
