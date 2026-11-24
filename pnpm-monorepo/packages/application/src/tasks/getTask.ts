import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  toTaskOutputs,
  toVisibleTask,
  type GetTaskOutput,
  type VisibleTask,
} from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { TASK_DETAILS_SELECT } from "./taskListSelect.js";
import { getVisibleTasksWhere } from "./taskWhere.js";

export const taskIdSchema = idSchema.describe(
  "The id of the task, for example from list_tasks.",
);

export const getTaskInputSchema = z.object({
  task_id: taskIdSchema,
});

export type GetTaskInput = z.output<typeof getTaskInputSchema>;

export const findVisibleTask = async (
  context: ApplicationContext,
  actor: Actor,
  taskId: string,
): Promise<VisibleTask> => {
  requirePermission(actor, "task", "read");

  const task = await context.prisma.task.findFirst({
    where: {
      AND: [{ id: taskId, deletedAt: null }, getVisibleTasksWhere(actor)],
    },
    select: TASK_DETAILS_SELECT,
  });
  if (!task) throw new NotFoundError(TaskErrorMessage.NotFound);

  return toVisibleTask(actor, task);
};

export const getTask = (
  context: ApplicationContext,
  actor: Actor,
  input: GetTaskInput,
): Promise<GetTaskOutput> =>
  withSpan(context, "getTask", async () => {
    const task = await findVisibleTask(context, actor, input.task_id);

    const [output] = await toTaskOutputs(context, actor, [task]);

    return output!;
  });
