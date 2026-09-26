import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { TASK_LIST_SELECT } from "./taskListSelect";

export const getMyAssignedTasks = cache(
  withTrace("getMyAssignedTasks", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (!(await authentication.authorize("task", "read"))) forbidden();

    // An assignee can always see the task (see getVisibleTasksWhere)
    return prisma.task.findMany({
      where: {
        assignments: {
          some: {
            citizenId: authentication.session.entity.id,
          },
        },
        cancelledAt: null,
        deletedAt: null,
        completedAt: null,
        OR: [
          {
            expiresAt: {
              gte: new Date(),
            },
          },
          {
            expiresAt: null,
          },
        ],
      },
      select: TASK_LIST_SELECT,
    });
  }),
);
