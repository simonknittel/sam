"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  areActiveReceivers,
  INACTIVE_RECEIVER_ERROR,
} from "@/modules/silc/utils/activeReceivers";
import {
  announceSilcTransactions,
  createSilcTransactionsInTransaction,
  type NewSilcTransaction,
} from "@/modules/silc/utils/createSilcTransactions";
import {
  TaskRewardType,
  TaskVisibility,
  type Citizen,
  type Prisma,
} from "@sam-monorepo/database/client";
import { lockSilcLedger } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";
import { getOpenTasksWhere } from "../queries/getOpenTasksWhere";
import { isAllowedToManageTask } from "../utils/isAllowedToTask";
import { CLOSED_TASK_ERROR, requireOpenTask } from "../utils/requireOpenTask";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  completionistIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
});

/** The columns of the claimed task that the completion copies or pays */
const CLAIMED_TASK_INCLUDE = {
  assignments: {
    select: {
      citizenId: true,
    },
  },
  requiredRoles: {
    select: {
      id: true,
    },
  },
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
  completionistIds: readonly Citizen["id"][],
  createdById: Citizen["id"],
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

/** Creates the next repetition of a task that can be completed again */
const createRepetition = async (
  transaction: Prisma.TransactionClient,
  task: TaskToComplete,
  completionistIds: readonly Citizen["id"][],
  createdById: Citizen["id"],
) => {
  const columns = {
    visibility: task.visibility,
    assignmentLimit: task.assignmentLimit,
    title: task.title,
    description: task.description,
    createdById,
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
                  createdById,
                })),
            },
          },
          requiredRoles: {
            connect: task.requiredRoles.map((role) => ({
              id: role.id,
            })),
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
                createdById,
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
                createdById,
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

export const completeTask = createAuthenticatedAction(
  "completeTask",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Authorize the request
     */
    const { task, failure } = await requireOpenTask(data.id, formData);
    if (failure) return failure;
    const isAllowedToManage = await isAllowedToManageTask(task);
    const isAllowedToSelfComplete =
      task.canSelfComplete &&
      task.assignments.some(
        (assignment) =>
          assignment.citizenId === authentication.session.entity!.id,
      );
    if (!isAllowedToManage && !isAllowedToSelfComplete)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    // Deduplicated since each completionist may receive the reward only once
    const completionistIds = [...new Set(data.completionistIds)];

    // Managers may credit anyone, self-completers only the task's actual assignees
    if (!isAllowedToManage) {
      const assigneeIds = new Set(
        task.assignments.map((assignment) => assignment.citizenId),
      );
      if (
        completionistIds.some(
          (completionistId) => !assigneeIds.has(completionistId),
        )
      )
        return {
          error: t("Common.forbidden"),
          requestPayload: formData,
        };
    }

    if (completionistIds.length <= 0)
      return {
        error:
          "Der Task kann nicht abgeschlossen werden, ohne dass ihn jemand erfüllt hat.",
        requestPayload: formData,
      };
    if (!(await areActiveReceivers(completionistIds))) {
      /** A different user deleted a completionist, and the page must show it */
      return rejectConflict(INACTIVE_RECEIVER_ERROR, formData);
    }

    /**
     * Complete the task, pay the reward and create the next repetition in
     * one transaction
     */
    const completedById = authentication.session.entity.id;
    const completedAt = new Date();

    const silcTransactionIds = await prisma.$transaction(
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
          where: {
            AND: [{ id: task.id }, getOpenTasksWhere(completedAt)],
          },
          data: {
            completedAt,
            completedById,
          },
        });
        if (count === 0) return null;

        /**
         * Read the task again after the claim: an edit that ran before the
         * claim can have changed the reward or the assignments
         */
        const claimedTask = await transaction.task.update({
          where: {
            id: task.id,
          },
          data: {
            completionists: {
              connect: completionistIds.map((id) => ({
                id,
              })),
            },
          },
          include: CLAIMED_TASK_INCLUDE,
        });

        if (claimedTask.repeatable > 1)
          await createRepetition(
            transaction,
            claimedTask,
            completionistIds,
            completedById,
          );

        const rewardTransactions = getRewardTransactions(
          claimedTask,
          completionistIds,
          completedById,
        );
        if (rewardTransactions.length === 0) return [];

        return createSilcTransactionsInTransaction(
          transaction,
          rewardTransactions,
        );
      },
    );

    /**
     * Also on the conflict: the page then shows the task that a different
     * completion closed
     */
    refresh();

    if (!silcTransactionIds)
      return {
        error: CLOSED_TASK_ERROR,
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.TASK_COMPLETED,
        data: {
          taskId: task.id,
          completionistIds,
          rewardType: task.rewardType,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    const areTransactionsAnnounced =
      await announceSilcTransactions(silcTransactionIds);

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich abgeschlossen.",
      ...(areTransactionsAnnounced
        ? {}
        : { warning: t("Common.notificationsFailed") }),
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      completionistIds: formData.getAll("completionistId[]"),
    }),
  },
);
