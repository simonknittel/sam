import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { buildUnreadWhere } from "../readMarkers/unreadWhere.js";
import { TASK_LIST_SELECT, type TaskListRow } from "./taskListSelect.js";
import { getOpenTasksWhere, getVisibleTasksWhere } from "./taskWhere.js";

/**
 * The visibility is not checked, because an assignee always sees the task (see
 * `getVisibleTasksWhere`). The rows have no order.
 */
export const findOwnOpenTaskRows = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<TaskListRow[]> => {
  requirePermission(actor, "task", "read");
  const citizen = requireCitizen(actor);

  return context.prisma.task.findMany({
    where: {
      AND: [
        { assignments: { some: { citizenId: citizen.id } } },
        getOpenTasksWhere(context.now()),
      ],
    },
    select: TASK_LIST_SELECT,
  });
};

interface NewTaskRowsOptions {
  readonly limit: number;
}

/**
 * The tasks that the citizen of the actor accepted are left out: the tile
 * "Meine Tasks" shows them
 */
export const findNewTaskRows = async (
  context: ApplicationContext,
  actor: Actor,
  { limit }: NewTaskRowsOptions,
): Promise<TaskListRow[]> => {
  requirePermission(actor, "task", "read");
  const citizen = requireCitizen(actor);

  const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Task);
  if (!unreadWhere) return [];

  return context.prisma.task.findMany({
    where: {
      AND: [
        getVisibleTasksWhere(actor),
        getOpenTasksWhere(context.now()),
        unreadWhere,
        { assignments: { none: { citizenId: citizen.id } } },
      ],
    },
    select: TASK_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};
