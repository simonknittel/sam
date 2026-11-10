import type { Prisma } from "@sam-monorepo/database/client";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";

/**
 * What a task list row of the app needs: the fields the `Task` component
 * renders. The list queries of the app serialize their rows into that client
 * component, thus the Markdown description and the reward configuration,
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
      citizen: { select: CITIZEN_REFERENCE_SELECT },
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

/**
 * A list row of the use cases: the fields of `TASK_LIST_SELECT` and the
 * fields of the list items of the MCP tools. The app keeps only the fields
 * of `TASK_LIST_SELECT` (`toTaskListRow()`) before a row goes to the client.
 */
export const TASK_LIST_ITEM_SELECT = {
  ...TASK_LIST_SELECT,
  description: true,
  rewardType: true,
  rewardSilcValue: true,
  rewardTypeTextValue: true,
  visibility: true,
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.TaskSelect;

export type TaskListItemRow = Prisma.TaskGetPayload<{
  select: typeof TASK_LIST_ITEM_SELECT;
}>;

/** The fields of `TASK_LIST_SELECT` of a list row of the use cases */
export const toTaskListRow = ({
  id,
  title,
  createdAt,
  completedAt,
  expiresAt,
  repeatable,
  cancelledAt,
  deletedAt,
  assignments,
  completionists,
}: TaskListItemRow): TaskListRow => ({
  id,
  title,
  createdAt,
  completedAt,
  expiresAt,
  repeatable,
  cancelledAt,
  deletedAt,
  assignments,
  completionists,
});

/**
 * The fields of the task page, of `getTask` and of the guards and the writes
 * of the task actions
 */
export const TASK_DETAILS_SELECT = {
  id: true,
  title: true,
  description: true,
  visibility: true,
  assignmentLimit: true,
  canSelfComplete: true,
  hiddenForOtherRoles: true,
  repeatable: true,
  rewardType: true,
  rewardSilcValue: true,
  rewardTypeTextValue: true,
  createdAt: true,
  createdById: true,
  expiresAt: true,
  completedAt: true,
  cancelledAt: true,
  deletedAt: true,
  assignments: {
    select: {
      id: true,
      citizenId: true,
      citizen: { select: CITIZEN_REFERENCE_SELECT },
    },
  },
  requiredRoles: { select: { id: true } },
  completionists: { select: CITIZEN_REFERENCE_SELECT },
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.TaskSelect;

export type TaskDetailsRow = Prisma.TaskGetPayload<{
  select: typeof TASK_DETAILS_SELECT;
}>;
