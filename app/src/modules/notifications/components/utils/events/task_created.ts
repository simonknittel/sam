import { prisma } from "@/db";
import { publishPusherNotification } from "@/modules/pusher/utils/publishNotification";
import type { Task } from "@prisma/client";

interface Payload {
  taskIds: Task["id"][];
}

const handler = async (payload: Payload) => {
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

  const notifications = [];

  for (const task of tasks) {
    for (const assignment of task.assignments) {
      notifications.push({
        interests: [`task_assigned;citizen_id=${assignment.citizenId}`],
        message: "Dir wurde ein Task zugewiesen",
        title: task.title,
        url: `/app/tasks/${task.id}`,
      });
    }
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
  key: "task_created",
  handler,
} as const;

export default event;
