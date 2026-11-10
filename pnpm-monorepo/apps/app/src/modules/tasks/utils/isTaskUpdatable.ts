import {
  isTaskUpdatable as isTaskUpdatableAt,
  type VisibleTask,
} from "@sam-monorepo/application";

/** Whether the task is still open now (see the rule of the application package) */
export const isTaskUpdatable = (
  task: Pick<
    VisibleTask,
    "completedAt" | "deletedAt" | "cancelledAt" | "expiresAt"
  >,
) => isTaskUpdatableAt(task, new Date());
