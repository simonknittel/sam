import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Tasks which are open at `now`: not cancelled, deleted, completed or
 * expired. The visibility is a separate fragment (see
 * `getVisibleTasksWhere`).
 */
export const getOpenTasksWhere = (now: Date): Prisma.TaskWhereInput => ({
  cancelledAt: null,
  deletedAt: null,
  completedAt: null,
  OR: [{ expiresAt: { gte: now } }, { expiresAt: null }],
});
