import { TaskVisibility } from "@sam-monorepo/database/browser";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, ValidationError } from "../errors.js";
import { findVisibleTask } from "./getTask.js";
import type { VisibleTask } from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { isAllowedToManageTask, isTaskUpdatable } from "./taskRules.js";

export const requireOpenTask = async (
  context: ApplicationContext,
  actor: Actor,
  taskId: string,
): Promise<VisibleTask> => {
  const task = await findVisibleTask(context, actor, taskId);
  if (!isTaskUpdatable(task, context.now()))
    throw new ConflictError(TaskErrorMessage.NotOpen);

  return task;
};

export const requireManageableTask = async (
  context: ApplicationContext,
  actor: Actor,
  taskId: string,
): Promise<VisibleTask> => {
  const task = await requireOpenTask(context, actor, taskId);
  if (!isAllowedToManageTask(actor, task))
    throw new ForbiddenError(
      "Only the creator of the task and task;manage can change it",
    );

  return task;
};

/** The creator assigns the citizens of a group or personalized task */
export const requireSelfAssignableTask = async (
  context: ApplicationContext,
  actor: Actor,
  taskId: string,
): Promise<VisibleTask> => {
  const task = await requireOpenTask(context, actor, taskId);
  if (task.visibility !== TaskVisibility.PUBLIC)
    throw new ValidationError(TaskErrorMessage.NotSelfAssignable);

  return task;
};
