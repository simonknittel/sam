import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, NotFoundError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { findVisibleTask, taskIdSchema } from "./getTask.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { isAllowedToManageTask } from "./taskRules.js";

export const deleteTaskInputSchema = z.object({
  task_id: taskIdSchema,
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

export interface DeleteTaskOutput {
  readonly task_id: string;
}

/**
 * Soft-deletes a task and notifies its assignees. Requires `task;delete`,
 * `task;read` and a citizen, and that the actor created the task or has
 * `task;manage`. A closed task can be deleted too.
 */
export const deleteTask = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteTaskInput,
): Promise<DeleteTaskOutput> =>
  withSpan(context, "deleteTask", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "task", "delete");

    const task = await findVisibleTask(context, actor, input.task_id);
    if (!isAllowedToManageTask(actor, task))
      throw new ForbiddenError(
        "Only the creator of the task and task;manage can delete it",
      );

    /**
     * The condition on `deletedAt` lets only one of two parallel requests
     * delete the task. The other request stops here, thus it writes no audit
     * event and sends nothing.
     */
    const { count } = await context.prisma.task.updateMany({
      where: { id: task.id, deletedAt: null },
      data: { deletedAt: context.now(), deletedById: citizen.id },
    });
    if (count === 0) throw new NotFoundError(TaskErrorMessage.NotFound);

    await context.audit.create([
      {
        type: AuditEventType.TASK_DELETED,
        data: { taskId: task.id, title: task.title },
        createdById: actor.userId,
      },
    ]);

    await triggerNotificationsAfterSave(context, [
      { type: "TaskDeleted", payload: { taskId: task.id } },
    ]);

    return { task_id: task.id };
  });
