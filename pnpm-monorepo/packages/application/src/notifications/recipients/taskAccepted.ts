import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";
import { findTaskReceivers } from "./taskRecipients.js";

export interface FindTaskAcceptedRecipientsInput {
  readonly taskId: string;
  /** The citizen who accepted the task */
  readonly citizenId: string;
}

export interface TaskAcceptedRecipients {
  readonly task: { readonly id: string; readonly title: string };
  /** The handle of the citizen who accepted the task */
  readonly citizenHandle: string | null;
  readonly recipients: Recipient[];
}

/**
 * The creator of the task when the creator can log in and open tasks, except
 * when the creator accepted the task. Null when the task is deleted or the
 * citizen does not have the assignment anymore.
 */
export const findTaskAcceptedRecipients = async (
  context: ApplicationContext,
  input: FindTaskAcceptedRecipientsInput,
): Promise<TaskAcceptedRecipients | null> => {
  const assignment = await context.prisma.taskAssignment.findUnique({
    where: {
      taskId_citizenId: {
        taskId: input.taskId,
        citizenId: input.citizenId,
      },
    },
    select: {
      citizen: {
        select: {
          handle: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          createdById: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!assignment || assignment.task.deletedAt) return null;

  return {
    task: { id: assignment.task.id, title: assignment.task.title },
    citizenHandle: assignment.citizen.handle,
    recipients: await findTaskReceivers(
      context,
      [assignment.task.createdById],
      input.citizenId,
    ),
  };
};
