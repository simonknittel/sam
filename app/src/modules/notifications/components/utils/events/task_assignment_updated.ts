import { prisma } from "@/db";
import { publishPusherNotification } from "@/modules/pusher/utils/publishNotification";
import type { Task } from "@prisma/client";

interface Payload {
  taskId: Task["id"];
}

const handler = async (payload: Payload) => {
  // TODO: Migrate to Novu
  // TODO: Only notify newly assigned citizens
  // TODO: Filter out citizens without login permission

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
  if (!task) return;

  const notifications = [];
  for (const assignment of task.assignments) {
    notifications.push({
      interests: [`task_assigned;citizen_id=${assignment.citizenId}`],
      message: "Dir wurde ein Task zugewiesen",
      title: task.title,
      url: `/app/tasks/${task.id}`,
    });
  }

  if (notifications.length > 0) {
    await Promise.all(
      notifications.map((notification) =>
        publishPusherNotification(
          notification.interests,
          notification.message,
          notification.title,
          notification.url,
        ),
      ),
    );
  }
};

const event = {
  key: "task_assignment_updated",
  handler,
} as const;

export default event;
