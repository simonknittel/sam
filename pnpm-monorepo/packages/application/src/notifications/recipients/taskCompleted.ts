import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";
import { findTaskReceivers } from "./taskRecipients.js";

export interface FindTaskCompletedRecipientsInput {
  readonly taskId: string;
}

export interface TaskCompletedRecipients {
  readonly task: { readonly id: string; readonly title: string };
  /** The handle of the citizen who completed the task */
  readonly citizenHandle: string | null;
  readonly recipients: Recipient[];
}

/**
 * The creator of the task when the creator can log in and open tasks, except
 * when the creator completed the task. Null when the task does not exist, is
 * deleted or is not completed.
 */
export const findTaskCompletedRecipients = async (
  context: ApplicationContext,
  input: FindTaskCompletedRecipientsInput,
): Promise<TaskCompletedRecipients | null> => {
  const task = await context.prisma.task.findUnique({
    where: {
      id: input.taskId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      createdById: true,
      completedAt: true,
      completedById: true,
      completedBy: {
        select: {
          handle: true,
        },
      },
    },
  });
  if (!task?.completedAt) return null;

  return {
    task: { id: task.id, title: task.title },
    citizenHandle: task.completedBy?.handle ?? null,
    recipients: await findTaskReceivers(
      context,
      [task.createdById],
      task.completedById,
    ),
  };
};
