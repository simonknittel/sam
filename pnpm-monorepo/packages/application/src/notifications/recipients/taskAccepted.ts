import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";
import { findTaskReceivers } from "./taskRecipients.js";

export interface FindTaskAcceptedRecipientsInput {
  readonly taskId: string;
  readonly citizenId: string;
}

export interface TaskAcceptedRecipients {
  readonly task: { readonly id: string; readonly title: string };
  readonly citizenHandle: string | null;
  readonly recipients: Recipient[];
}

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
