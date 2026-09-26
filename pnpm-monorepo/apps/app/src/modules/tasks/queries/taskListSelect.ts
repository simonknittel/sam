import type { Prisma } from "@sam-monorepo/database/client";

/**
 * What a task list row needs: the fields the `Task` component renders.
 * Shared by the list queries, which all serialize their rows into that client
 * component, thus the markdown description and the reward configuration,
 * which no list renders, stay on the server. The visibility of a task is
 * decided in the query (see `getVisibleTasksWhere`).
 */
export const TASK_LIST_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  completedAt: true,
  expiresAt: true,
  repeatable: true,
  cancelledAt: true,
  deletedAt: true,
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
  completionists: {
    select: {
      id: true,
    },
  },
} as const satisfies Prisma.TaskSelect;

export type TaskListRow = Prisma.TaskGetPayload<{
  select: typeof TASK_LIST_SELECT;
}>;
