import { prisma, type Task } from "@sam-monorepo/database";
import { publishNotifications } from "../publish";

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
  await publishNotifications(
    task.assignments.map((assignment) => ({
      receiverId: assignment.citizenId,
      notificationType: "task_assignment_updated" as const,
      payload: { taskId: task.id, taskTitle: task.title },
      title: "Neuer Task",
      body: `Dir wurde ein Task zugewiesen: ${task.title}`,
      url: `/app/tasks/${task.id}`,
    })),
  );
};
