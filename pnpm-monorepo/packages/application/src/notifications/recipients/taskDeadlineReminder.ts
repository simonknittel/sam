import type { ApplicationContext } from "../../context.js";
import { isTaskUpdatable } from "../../tasks/taskRules.js";
import type { Recipient } from "./recipient.js";
import { findTaskReceivers } from "./taskRecipients.js";

export interface FindTaskDeadlineReminderRecipientsInput {
  readonly taskId: string;
}

export interface TaskDeadlineReminderRecipients {
  readonly task: {
    readonly id: string;
    readonly title: string;
    readonly expiresAt: Date;
  };
  readonly recipients: Recipient[];
}

export const findTaskDeadlineReminderRecipients = async (
  context: ApplicationContext,
  input: FindTaskDeadlineReminderRecipientsInput,
): Promise<TaskDeadlineReminderRecipients | null> => {
  const task = await context.prisma.task.findUnique({
    where: {
      id: input.taskId,
    },
    select: {
      id: true,
      title: true,
      completedAt: true,
      cancelledAt: true,
      expiresAt: true,
      deletedAt: true,
      assignments: {
        select: {
          citizenId: true,
        },
      },
    },
  });
  if (!task?.expiresAt || !isTaskUpdatable(task, context.now())) return null;

  return {
    task: { id: task.id, title: task.title, expiresAt: task.expiresAt },
    recipients: await findTaskReceivers(
      context,
      task.assignments.map((assignment) => assignment.citizenId),
      null,
    ),
  };
};
