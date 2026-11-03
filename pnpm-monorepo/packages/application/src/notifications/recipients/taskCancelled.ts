import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";
import { findTaskReceivers } from "./taskRecipients.js";

export interface FindTaskCancelledRecipientsInput {
  readonly taskId: string;
}

export interface TaskCancelledRecipients {
  readonly task: { readonly id: string; readonly title: string };
  readonly recipients: Recipient[];
}

/**
 * The assignees of the cancelled task who can log in and open tasks, except
 * the citizen who cancelled the task. Null when the task does not exist, is
 * deleted or is not cancelled.
 */
export const findTaskCancelledRecipients = async (
  context: ApplicationContext,
  input: FindTaskCancelledRecipientsInput,
): Promise<TaskCancelledRecipients | null> => {
  const task = await context.prisma.task.findUnique({
    where: {
      id: input.taskId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      cancelledAt: true,
      cancelledById: true,
      assignments: {
        select: {
          citizenId: true,
        },
      },
    },
  });
  if (!task?.cancelledAt) return null;

  return {
    task: { id: task.id, title: task.title },
    recipients: await findTaskReceivers(
      context,
      task.assignments.map((assignment) => assignment.citizenId),
      task.cancelledById,
    ),
  };
};
