import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { getTask, taskIdSchema } from "./getTask.js";
import type { GetTaskOutput } from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { requireSelfAssignableTask } from "./taskGuards.js";

export const dropTaskInputSchema = z.object({
  task_id: taskIdSchema,
});

export type DropTaskInput = z.infer<typeof dropTaskInputSchema>;

export interface DropTaskOutput {
  /**
   * The task after the drop. Null when the user cannot see the task anymore:
   * a public task that is hidden for other roles is visible to its
   * assignees, also when they lost the required role.
   */
  readonly task: GetTaskOutput | null;
}

export const dropTask = (
  context: ApplicationContext,
  actor: Actor,
  input: DropTaskInput,
): Promise<DropTaskOutput> =>
  withSpan(context, "dropTask", async () => {
    const citizen = requireCitizen(actor);
    const task = await requireSelfAssignableTask(context, actor, input.task_id);

    const { count } = await context.prisma.taskAssignment.deleteMany({
      where: { taskId: task.id, citizenId: citizen.id },
    });
    // For example a different tab of the user dropped the task before
    if (count === 0) throw new ConflictError(TaskErrorMessage.NotAccepted);

    await context.audit.create([
      {
        type: AuditEventType.TASK_SELF_ASSIGNMENT_DELETED,
        data: { taskId: task.id, citizenId: citizen.id },
        createdById: actor.userId,
      },
    ]);

    try {
      return { task: await getTask(context, actor, { task_id: task.id }) };
    } catch (error) {
      if (error instanceof NotFoundError) return { task: null };
      throw error;
    }
  });
