import type { ApplicationContext } from "../../context.js";
import { isTaskUpdatable } from "../../tasks/taskRules.js";
import type { Recipient } from "./recipient.js";
import { findTaskReceivers } from "./taskRecipients.js";

export interface FindTaskDeletedRecipientsInput {
  readonly taskId: string;
}

export interface TaskDeletedRecipients {
  readonly task: { readonly title: string };
  readonly recipients: Recipient[];
}

export const findTaskDeletedRecipients = async (
  context: ApplicationContext,
  input: FindTaskDeletedRecipientsInput,
): Promise<TaskDeletedRecipients | null> => {
  const task = await context.prisma.task.findUnique({
    where: {
      id: input.taskId,
    },
    select: {
      title: true,
      completedAt: true,
      cancelledAt: true,
      expiresAt: true,
      deletedAt: true,
      deletedById: true,
      assignments: {
        select: {
          citizenId: true,
        },
      },
    },
  });
  if (!task?.deletedAt) return null;

  // The deletion of a closed task only cleans up, thus it notifies nobody.
  // The rule reads the task as it was at the time of the deletion.
  if (!isTaskUpdatable({ ...task, deletedAt: null }, task.deletedAt))
    return null;

  return {
    task: { title: task.title },
    recipients: await findTaskReceivers(
      context,
      task.assignments.map((assignment) => assignment.citizenId),
      task.deletedById,
    ),
  };
};
