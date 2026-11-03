import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { taskIdSchema } from "./getTask.js";
import { findTaskOutput, type GetTaskOutput } from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { requireManageableTask } from "./taskGuards.js";
import { getOpenTasksWhere } from "./taskWhere.js";

export const cancelTaskInputSchema = z.object({
  task_id: taskIdSchema,
});

export type CancelTaskInput = z.infer<typeof cancelTaskInputSchema>;

/**
 * Cancels an open task and notifies its assignees. Requires `task;read`, a
 * citizen, and that the actor created the task or has `task;manage`.
 */
export const cancelTask = (
  context: ApplicationContext,
  actor: Actor,
  input: CancelTaskInput,
): Promise<GetTaskOutput> =>
  withSpan(context, "cancelTask", async () => {
    const citizen = requireCitizen(actor);
    const task = await requireManageableTask(context, actor, input.task_id);

    /**
     * The condition lets only one of two parallel requests close the task,
     * for example a cancellation and a completion. The other request stops
     * here, thus it writes no audit event and sends nothing.
     */
    const now = context.now();
    const { count } = await context.prisma.task.updateMany({
      where: { AND: [{ id: task.id }, getOpenTasksWhere(now)] },
      data: { cancelledAt: now, cancelledById: citizen.id },
    });
    if (count === 0) throw new ConflictError(TaskErrorMessage.NotOpen);

    await context.audit.create([
      {
        type: AuditEventType.TASK_CANCELLED,
        data: { taskId: task.id, title: task.title },
        createdById: actor.userId,
      },
    ]);

    await triggerNotificationsAfterSave(context, [
      { type: "TaskCancelled", payload: { taskId: task.id } },
    ]);

    return findTaskOutput(context, actor, task.id);
  });
