import type { Prisma } from "@sam-monorepo/database/client";

/**
 * What a task list row needs: the fields the `Task` component renders plus
 * the ones `isVisibleForCurrentUser()` decides on. Shared by the four list
 * queries, which all serialize their rows into that client component — so
 * the markdown description and the reward configuration, which no list
 * renders, stay on the server.
 */
export const TASK_LIST_SELECT = {
  id: true,
  title: true,
  visibility: true,
  createdAt: true,
  completedAt: true,
  expiresAt: true,
  repeatable: true,
  cancelledAt: true,
  deletedAt: true,
  createdById: true,
  hiddenForOtherRoles: true,
  assignments: {
    select: {
      citizenId: true,
      citizen: {
        select: {
          id: true,
          handle: true,
        },
      },
    },
  },
  requiredRoles: {
    select: {
      id: true,
    },
  },
  completionists: {
    select: {
      id: true,
    },
  },
} as const satisfies Prisma.TaskSelect;

export type TaskListRow = Prisma.TaskGetPayload<{
  select: typeof TASK_LIST_SELECT;
}>;
