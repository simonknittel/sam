import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getVisibleTasksWhere } from "./getVisibleTasksWhere";
import { TASK_LIST_SELECT } from "./taskListSelect";

export const getLatestVisibleTasks = cache(
  withTrace("getLatestVisibleTasks", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (!(await authentication.authorize("task", "read"))) forbidden();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return prisma.task.findMany({
      where: {
        AND: [await getVisibleTasksWhere()],
        createdById: {
          not: authentication.session.entity.id,
        },
        assignments: {
          none: {
            citizenId: authentication.session.entity.id,
          },
        },
        createdAt: {
          gte: sevenDaysAgo,
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
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });
  }),
);
