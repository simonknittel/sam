import { prisma, type Task } from "@sam-monorepo/database";
import { publishNotifications } from "../publish";

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
  await publishNotifications(
    tasks.flatMap((task) =>
      task.assignments.map((assignment) => ({
        receiverId: assignment.citizenId,
        notificationType: "task_assignment_updated" as const,
        payload: { taskId: task.id, taskTitle: task.title },
        title: "Neuer Task",
        body: `Dir wurde ein Task zugewiesen: ${task.title}`,
        url: `/app/tasks/${task.id}`,
      })),
    ),
  );
};
