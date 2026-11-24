import {
  isTaskUpdatable as isTaskUpdatableAt,
  type VisibleTask,
} from "@sam-monorepo/application";

export const isTaskUpdatable = (
  task: Pick<
    VisibleTask,
    "completedAt" | "deletedAt" | "cancelledAt" | "expiresAt"
  >,
) => isTaskUpdatableAt(task, new Date());
