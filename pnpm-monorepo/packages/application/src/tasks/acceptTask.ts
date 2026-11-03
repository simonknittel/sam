import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { taskIdSchema } from "./getTask.js";
import { findTaskOutput, type GetTaskOutput } from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { requireSelfAssignableTask } from "./taskGuards.js";

export const acceptTaskInputSchema = z.object({
  task_id: taskIdSchema,
});

export type AcceptTaskInput = z.infer<typeof acceptTaskInputSchema>;

/**
 * Assigns the citizen of the actor to an open public task and notifies the
 * creator of the task. Requires `task;read`, a citizen, a free place and one
 * of the required roles. A repeated call changes nothing, sends nothing and
 * gives the task like the first one.
 */
export const acceptTask = (
  context: ApplicationContext,
  actor: Actor,
  input: AcceptTaskInput,
): Promise<GetTaskOutput> =>
  withSpan(context, "acceptTask", async () => {
    const citizen = requireCitizen(actor);
    const task = await requireSelfAssignableTask(context, actor, input.task_id);

    if (
      task.assignments.some((assignment) => assignment.citizenId === citizen.id)
    )
      return findTaskOutput(context, actor, task.id);

    if (task.assignmentLimit && task.assignments.length >= task.assignmentLimit)
      throw new ConflictError(TaskErrorMessage.AssignmentLimitReached);

    if (!task.hasCurrentUserRequiredRole)
      throw new ForbiddenError(TaskErrorMessage.MissingRequiredRole);

    try {
      await context.prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          citizenId: citizen.id,
          createdById: citizen.id,
        },
      });
    } catch (error) {
      // A different tab or call of the user accepted the task in between
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
        return findTaskOutput(context, actor, task.id);

      throw error;
    }

    await context.audit.create([
      {
        type: AuditEventType.TASK_SELF_ASSIGNMENT_CREATED,
        data: { taskId: task.id, citizenId: citizen.id },
        createdById: actor.userId,
      },
    ]);

    await triggerNotificationsAfterSave(context, [
      {
        type: "TaskAccepted",
        payload: { taskId: task.id, citizenId: citizen.id },
      },
    ]);

    return findTaskOutput(context, actor, task.id);
  });
