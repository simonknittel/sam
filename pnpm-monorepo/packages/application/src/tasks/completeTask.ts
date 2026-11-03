import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  createSilcTransactionsInTransaction,
  lockSilcLedger,
  TASK_MAX_CITIZENS,
  type NewSilcTransaction,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import {
  announceSilcTransactions,
  areActiveReceivers,
} from "../silc/silcLedger.js";
import { withSpan } from "../withSpan.js";
import { taskIdSchema } from "./getTask.js";
import { findTaskOutput, type GetTaskOutput } from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { requireOpenTask } from "./taskGuards.js";
import { isAllowedToManageTask } from "./taskRules.js";
import { getOpenTasksWhere } from "./taskWhere.js";

export const completeTaskInputSchema = z.object({
  task_id: taskIdSchema,
  completionist_ids: z
    .array(idSchema)
    .max(TASK_MAX_CITIZENS)
    .describe(
      "The ids of the citizens who completed the task and get the reward, for example the assignees from get_task.",
    ),
});

export type CompleteTaskInput = z.infer<typeof completeTaskInputSchema>;

/** The columns of the claimed task that the completion copies or pays */
const CLAIMED_TASK_INCLUDE = {
  assignments: { select: { citizenId: true } },
  requiredRoles: { select: { id: true } },
} as const satisfies Prisma.TaskInclude;

type TaskToComplete = Prisma.TaskGetPayload<{
  include: typeof CLAIMED_TASK_INCLUDE;
}>;

/**
 * Each completionist gets the reward. With the reward type SILC, the creator
 * of the task pays it. A reward of the type TEXT has no SILC transactions.
 */
const getRewardTransactions = (
  task: TaskToComplete,
  completionistIds: readonly string[],
  createdById: string,
): NewSilcTransaction[] => {
  if (task.rewardType === TaskRewardType.TEXT) return [];

  if (task.rewardSilcValue === null)
    throw new Error(`The SILC reward of task ${task.id} has no value`);

  const rewardSilcValue = task.rewardSilcValue;
  const rewards = completionistIds.map((receiverId) => ({
    receiverId,
    value: rewardSilcValue,
    description: `Task erfüllt: ${task.title}`,
    createdById,
    taskId: task.id,
  }));

  switch (task.rewardType) {
    case TaskRewardType.NEW_SILC:
      return rewards;

    case TaskRewardType.SILC:
      if (!task.createdById) return rewards;

      return [
        ...rewards,
        {
          receiverId: task.createdById,
          value: -(rewardSilcValue * completionistIds.length),
          description: `Task abgeschlossen: ${task.title}`,
          createdById,
          taskId: task.id,
        },
      ];

    default:
      throw new Error(
        `Unknown task reward type: ${task.rewardType satisfies never}`,
      );
  }
};

/**
 * Creates the next repetition of a task that can be completed again. The
 * repetition keeps the creator of the task: the creator manages it and pays
 * a SILC reward. The completer is only the author of the copied assignments.
 */
const createRepetition = async (
  transaction: Prisma.TransactionClient,
  task: TaskToComplete,
  completionistIds: readonly string[],
  completerId: string,
) => {
  const columns = {
    visibility: task.visibility,
    assignmentLimit: task.assignmentLimit,
    title: task.title,
    description: task.description,
    createdById: task.createdById,
    expiresAt: task.expiresAt,
    rewardType: task.rewardType,
    rewardTypeTextValue: task.rewardTypeTextValue,
    rewardSilcValue: task.rewardSilcValue,
    repeatable: task.repeatable - 1,
  } satisfies Prisma.TaskUncheckedCreateInput;

  switch (task.visibility) {
    case TaskVisibility.PUBLIC:
      await transaction.task.create({
        data: {
          ...columns,
          assignments: {
            createMany: {
              data: task.assignments
                .filter(
                  (assignment) =>
                    !completionistIds.includes(assignment.citizenId),
                )
                .map((assignment) => ({
                  citizenId: assignment.citizenId,
                  createdById: completerId,
                })),
            },
          },
          requiredRoles: {
            connect: task.requiredRoles.map((role) => ({ id: role.id })),
          },
          hiddenForOtherRoles: task.hiddenForOtherRoles,
        },
      });
      break;

    case TaskVisibility.GROUP:
      await transaction.task.create({
        data: {
          ...columns,
          assignments: {
            createMany: {
              data: task.assignments.map((assignment) => ({
                citizenId: assignment.citizenId,
                createdById: completerId,
              })),
            },
          },
          canSelfComplete: task.canSelfComplete,
        },
      });
      break;

    case TaskVisibility.PERSONALIZED:
      for (const assignment of task.assignments) {
        await transaction.task.create({
          data: {
            ...columns,
            assignments: {
              create: {
                citizenId: assignment.citizenId,
                createdById: completerId,
              },
            },
            canSelfComplete: task.canSelfComplete,
          },
        });
      }
      break;

    default:
      throw new Error(
        `Unknown task visibility: ${task.visibility satisfies never}`,
      );
  }
};

/**
 * Completes an open task: pays the reward to the completionists, creates the
 * next repetition and notifies the receivers of the SILC and the creator of
 * the task. Requires `task;read`, a citizen, and that the actor created the
 * task or has `task;manage`. An assignee of a task that the assignees can
 * complete themselves can complete it for the assignees.
 */
export const completeTask = (
  context: ApplicationContext,
  actor: Actor,
  input: CompleteTaskInput,
): Promise<GetTaskOutput> =>
  withSpan(context, "completeTask", async () => {
    const citizen = requireCitizen(actor);
    const task = await requireOpenTask(context, actor, input.task_id);

    const isAllowedToManage = isAllowedToManageTask(actor, task);
    const assigneeIds = new Set(
      task.assignments.map((assignment) => assignment.citizenId),
    );
    if (
      !isAllowedToManage &&
      !(task.canSelfComplete && assigneeIds.has(citizen.id))
    )
      throw new ForbiddenError(
        "Only the creator of the task, task;manage and the assignees of a task that they can complete themselves can complete it",
      );

    // Deduplicated since each completionist may receive the reward only once
    const completionistIds = [...new Set(input.completionist_ids)];

    // Managers may credit anyone, self-completers only the assignees
    if (
      !isAllowedToManage &&
      completionistIds.some(
        (completionistId) => !assigneeIds.has(completionistId),
      )
    )
      throw new ForbiddenError(
        "A self-completion can credit only the assignees of the task",
      );

    if (completionistIds.length <= 0)
      throw new ValidationError(TaskErrorMessage.NoCompletionist);

    // For example a different user deleted a completionist
    if (!(await areActiveReceivers(context.prisma, completionistIds)))
      throw new ConflictError(TaskErrorMessage.InactiveCompletionist);

    /**
     * Complete the task, pay the reward and create the next repetition in
     * one transaction
     */
    const completedAt = context.now();
    const silcTransactionIds = await context.prisma.$transaction(
      async (transaction) => {
        /**
         * The reward writes the ledger, thus the ledger lock comes first,
         * before the lock of the task row (see `lockSilcLedger()`)
         */
        await lockSilcLedger(transaction);

        /**
         * Only one completion can claim the task. A parallel completion
         * waits for the locks and then finds no open task.
         */
        const { count } = await transaction.task.updateMany({
          where: { AND: [{ id: task.id }, getOpenTasksWhere(completedAt)] },
          data: { completedAt, completedById: citizen.id },
        });
        if (count === 0) return null;

        /**
         * Read the task again after the claim: an edit that ran before the
         * claim can have changed the reward or the assignments
         */
        const claimedTask = await transaction.task.update({
          where: { id: task.id },
          data: {
            completionists: {
              connect: completionistIds.map((id) => ({ id })),
            },
          },
          include: CLAIMED_TASK_INCLUDE,
        });

        if (claimedTask.repeatable > 1)
          await createRepetition(
            transaction,
            claimedTask,
            completionistIds,
            citizen.id,
          );

        const rewardTransactions = getRewardTransactions(
          claimedTask,
          completionistIds,
          citizen.id,
        );
        if (rewardTransactions.length === 0) return [];

        return createSilcTransactionsInTransaction(
          transaction,
          rewardTransactions,
        );
      },
    );
    if (!silcTransactionIds) throw new ConflictError(TaskErrorMessage.NotOpen);

    await context.audit.create([
      {
        type: AuditEventType.TASK_COMPLETED,
        data: {
          taskId: task.id,
          completionistIds,
          rewardType: task.rewardType,
        },
        createdById: actor.userId,
      },
    ]);

    await Promise.all([
      announceSilcTransactions(context, silcTransactionIds),
      triggerNotificationsAfterSave(context, [
        { type: "TaskCompleted", payload: { taskId: task.id } },
      ]),
    ]);

    return findTaskOutput(context, actor, task.id);
  });
