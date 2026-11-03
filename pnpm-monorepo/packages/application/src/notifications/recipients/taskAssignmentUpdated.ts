import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";
import { findTaskReceivers } from "./taskRecipients.js";

export interface FindTaskAssignmentRecipientsInput {
  readonly taskId: string;
}

export interface TaskAssignmentRecipients {
  readonly task: { readonly id: string; readonly title: string };
  readonly recipients: Recipient[];
}

/**
 * The assignees of the task who can log in and open tasks, except the
 * assignees who made their assignment themselves: an actor who assigns the
 * own citizen, or a citizen who accepted the task. Null when the task does
 * not exist.
 */
export const findTaskAssignmentRecipients = async (
  context: ApplicationContext,
  input: FindTaskAssignmentRecipientsInput,
): Promise<TaskAssignmentRecipients | null> => {
  // TODO: Only notify newly assigned citizens

  const task = await context.prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      title: true,
      assignments: {
        select: {
          citizenId: true,
          createdById: true,
        },
      },
    },
  });
  if (!task) return null;

  return {
    task: { id: task.id, title: task.title },
    recipients: await findTaskReceivers(
      context,
      task.assignments
        .filter((assignment) => assignment.createdById !== assignment.citizenId)
        .map((assignment) => assignment.citizenId),
      null,
    ),
  };
};
