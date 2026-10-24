import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { DATE_TIME_INPUT_DESCRIPTION } from "../dateTime.js";
import { ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { requireVisibleRoles } from "../roles/roleVisibility.js";
import { requireActiveCitizens } from "../spynet/requireActiveCitizens.js";
import { withSpan } from "../withSpan.js";
import { findTaskOutput, type GetTaskOutput } from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import {
  TASK_REWARD_TYPE_BY_KIND,
  TASK_VISIBILITY_BY_KIND,
  taskFieldSchemas,
} from "./taskInput.js";
import { TaskRewardKind, TaskVisibilityKind } from "./taskOutput.js";

export const createTaskInputSchema = z.object({
  title: taskFieldSchemas.title,
  description: taskFieldSchemas.description.optional(),
  visibility: z
    .enum(TaskVisibilityKind)
    .describe(
      "public: each citizen who can see the task can accept it. group: one task for the citizens of assignee_ids. personalized: one separate task for each citizen of assignee_ids. group and personalized need an extra permission.",
    ),
  reward: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal(TaskRewardKind.Text),
        value: taskFieldSchemas.reward_text,
      }),
      z.object({
        type: z.literal([TaskRewardKind.Silc, TaskRewardKind.NewSilc]),
        value: taskFieldSchemas.reward_silc_value,
      }),
    ])
    .describe(
      "silc: the creator of the task pays the SILC to each completionist. new_silc: each completionist gets new SILC, this needs an extra permission. text: a reward that is no SILC.",
    ),
  expires_at: taskFieldSchemas.expires_at
    .optional()
    .describe(
      `When the task expires. ${DATE_TIME_INPUT_DESCRIPTION} Without it, the task never expires.`,
    ),
  repeatable: taskFieldSchemas.repeatable.default(1),
  assignment_limit: taskFieldSchemas.assignment_limit.default(null),
  required_role_ids: taskFieldSchemas.required_role_ids.default([]),
  hidden_for_other_roles:
    taskFieldSchemas.hidden_for_other_roles.default(false),
  assignee_ids: taskFieldSchemas.assignee_ids
    .default([])
    .describe(
      "Only for group and personalized: the citizens of the task, from a Spynet tool.",
    ),
  can_self_complete: z
    .boolean()
    .default(false)
    .describe(
      "Only for group and personalized: whether the assignees can complete the task themselves.",
    ),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export interface CreateTaskOutput {
  /**
   * False when the tasks are saved, but the notifications failed. The tasks
   * stand, thus the caller must not create them again.
   */
  readonly notifications_sent: boolean;
  /**
   * The new task. A personalized task becomes one task for each assignee:
   * this is the first of them.
   */
  readonly task: GetTaskOutput;
  /** The ids of all new tasks */
  readonly task_ids: string[];
}

/** Only the value column of the reward type is set (see the reward CHECK) */
const getRewardColumns = (reward: CreateTaskInput["reward"]) =>
  reward.type === TaskRewardKind.Text
    ? {
        rewardType: TaskRewardType.TEXT,
        rewardTypeTextValue: reward.value,
        rewardSilcValue: null,
      }
    : {
        rewardType: TASK_REWARD_TYPE_BY_KIND[reward.type],
        rewardTypeTextValue: null,
        rewardSilcValue: reward.value,
      };

/** @returns The ids of the created tasks */
const createTaskRows = async (
  context: ApplicationContext,
  input: CreateTaskInput,
  createdById: string,
): Promise<string[]> => {
  const visibility = TASK_VISIBILITY_BY_KIND[input.visibility];
  const columns = {
    visibility,
    assignmentLimit: input.assignment_limit,
    title: input.title,
    description: input.description,
    createdById,
    expiresAt: input.expires_at,
    ...getRewardColumns(input.reward),
    repeatable: input.repeatable,
  } satisfies Prisma.TaskUncheckedCreateInput;
  const assigneeIds = [...new Set(input.assignee_ids)];

  switch (visibility) {
    case TaskVisibility.PUBLIC: {
      const task = await context.prisma.task.create({
        data: {
          ...columns,
          requiredRoles: {
            connect: input.required_role_ids.map((roleId) => ({ id: roleId })),
          },
          hiddenForOtherRoles: input.hidden_for_other_roles,
        },
        select: { id: true },
      });

      return [task.id];
    }

    case TaskVisibility.GROUP: {
      const task = await context.prisma.task.create({
        data: {
          ...columns,
          assignments: {
            createMany: {
              data: assigneeIds.map((citizenId) => ({
                citizenId,
                createdById,
              })),
            },
          },
          canSelfComplete: input.can_self_complete,
        },
        select: { id: true },
      });

      return [task.id];
    }

    case TaskVisibility.PERSONALIZED: {
      const tasks = await context.prisma.$transaction(
        assigneeIds.map((citizenId) =>
          context.prisma.task.create({
            data: {
              ...columns,
              assignments: { create: { citizenId, createdById } },
              canSelfComplete: input.can_self_complete,
            },
            select: { id: true },
          }),
        ),
      );

      return tasks.map((task) => task.id);
    }

    default:
      throw new Error(`Unknown task visibility: ${visibility satisfies never}`);
  }
};

/**
 * Creates a task and notifies about it. A personalized task becomes one task
 * for each assignee. Requires `task;create` and a citizen; a group or a
 * personalized task and a reward of new SILC need the permission with the
 * attribute of the visibility or of the reward type.
 */
export const createTask = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateTaskInput,
): Promise<CreateTaskOutput> =>
  withSpan(context, "createTask", async () => {
    requirePermission(actor, "task", "create");
    const creator = requireCitizen(actor);

    const visibility = TASK_VISIBILITY_BY_KIND[input.visibility];
    const rewardType = TASK_REWARD_TYPE_BY_KIND[input.reward.type];
    // One permission attribute allows the group and the personalized tasks
    if (visibility !== TaskVisibility.PUBLIC)
      requirePermission(actor, "task", "create", [
        { key: "taskVisibility", value: TaskVisibility.PERSONALIZED },
      ]);
    if (rewardType === TaskRewardType.NEW_SILC)
      requirePermission(actor, "task", "create", [
        { key: "taskRewardType", value: TaskRewardType.NEW_SILC },
      ]);

    // Each visibility stores only its own list (see `createTaskRows()`)
    if (visibility === TaskVisibility.PUBLIC)
      await requireVisibleRoles(
        context,
        actor,
        input.required_role_ids,
        TaskErrorMessage.UnknownRequiredRole,
      );
    else
      await requireActiveCitizens(
        context,
        input.assignee_ids,
        TaskErrorMessage.UnknownAssignee,
      );
    // Without an assignee, a personalized task would become no task
    if (
      visibility === TaskVisibility.PERSONALIZED &&
      input.assignee_ids.length <= 0
    )
      throw new ValidationError(TaskErrorMessage.NoAssignee);

    const taskIds = await createTaskRows(context, input, creator.id);

    await context.audit.create([
      {
        type: AuditEventType.TASK_CREATED,
        data: { taskIds, visibility, rewardType },
        createdById: actor.userId,
      },
    ]);

    const notificationsSent = await triggerNotificationsAfterSave(context, [
      { type: "TaskCreated", payload: { taskIds } },
    ]);

    const [firstTaskId] = taskIds;
    if (!firstTaskId) throw new Error("The creation of a task created no row");

    return {
      notifications_sent: notificationsSent,
      task: await findTaskOutput(context, actor, firstTaskId),
      task_ids: taskIds,
    };
  });
