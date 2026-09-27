import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { getUnreadWhere } from "@/modules/read-markers/queries/getUnreadWhere";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getOpenTasksWhere } from "./getOpenTasksWhere";
import { getVisibleTasksWhere } from "./getVisibleTasksWhere";
import { TASK_LIST_SELECT } from "./taskListSelect";

/** Keeps the tile short; the tasks list shows all new tasks */
const MAX_TASKS = 5;

/**
 * The newest tasks which are new for the viewer, for the "Neue Tasks" tile.
 * Tasks assigned to the viewer are left out: the "Meine Tasks" tile already
 * shows them.
 */
export const getNewTasksForDashboard = cache(
  withTrace("getNewTasksForDashboard", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (!(await authentication.authorize("task", "read"))) forbidden();

    const unreadWhere = await getUnreadWhere(ReadMarkerSubject.Task);
    if (!unreadWhere) return [];

    return prisma.task.findMany({
      where: {
        AND: [
          await getVisibleTasksWhere(),
          getOpenTasksWhere(new Date()),
          unreadWhere,
          {
            assignments: {
              none: {
                citizenId: authentication.session.entity.id,
              },
            },
          },
        ],
      },
      select: TASK_LIST_SELECT,
      orderBy: {
        createdAt: "desc",
      },
      take: MAX_TASKS,
    });
  }),
);
