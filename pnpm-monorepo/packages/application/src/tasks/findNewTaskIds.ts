import type { ApplicationContext } from "../context.js";
import type { UnreadWhere } from "../readMarkers/unreadWhere.js";
import { getOpenTasksWhere } from "./taskWhere.js";

export const findNewTaskIds = async (
  prisma: ApplicationContext["prisma"],
  taskIds: readonly string[],
  unreadWhere: UnreadWhere,
  now: Date,
): Promise<string[]> => {
  if (taskIds.length <= 0) return [];

  const tasks = await prisma.task.findMany({
    where: {
      AND: [{ id: { in: [...taskIds] } }, getOpenTasksWhere(now), unreadWhere],
    },
    select: { id: true },
  });

  return tasks.map((task) => task.id);
};
