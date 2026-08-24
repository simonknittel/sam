import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { isVisibleForCurrentUser } from "../utils/isVisibleForCurrentUser";
import { TASK_LIST_SELECT } from "./taskListSelect";

export const getLatestVisibleTasks = cache(
  withTrace("getLatestVisibleTasks", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (!(await authentication.authorize("task", "read"))) forbidden();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let tasks = await prisma.task.findMany({
      where: {
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

    tasks = (
      await Promise.all(
        tasks.map(async (task) => {
          const include = await isVisibleForCurrentUser(task);

          return {
            include,
            task,
          };
        }),
      )
    )
      .filter(({ include }) => include)
      .map(({ task }) => task);

    return tasks;
  }),
);
