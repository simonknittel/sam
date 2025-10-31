import { prisma, type Task } from "@sam-monorepo/database";
import { publishWebPushNotifications } from "../web-push";

interface Payload {
  taskId: Task["id"];
}

export const TaskAssignmentUpdatedHandler = async (payload: Payload) => {
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
  await publishWebPushNotifications(
    task.assignments.map((assignment) => ({
      receiverId: assignment.citizenId,
      notificationType: "task_assignment_updated",
      title: "Neuer Task",
      body: `Dir wurde ein Task zugewiesen: ${task.title}`,
      url: `/app/tasks/${task.id}`,
    })),
  );
};
