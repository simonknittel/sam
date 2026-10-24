import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext, Notification } from "../context.js";
import { DATE_TIME_INPUT_DESCRIPTION } from "../dateTime.js";
import { ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { requireVisibleRoles } from "../roles/roleVisibility.js";
import { requireActiveCitizens } from "../spynet/requireActiveCitizens.js";
import { withSpan } from "../withSpan.js";
import { taskIdSchema } from "./getTask.js";
import {
  findTaskOutput,
  type NotifyingTaskWriteOutput,
  type VisibleTask,
} from "./taskDetails.js";
import { TaskErrorMessage } from "./taskErrors.js";
import { requireManageableTask } from "./taskGuards.js";
import { taskFieldSchemas } from "./taskInput.js";

export const updateTaskInputSchema = z.object({
  task_id: taskIdSchema,
  title: taskFieldSchemas.title.optional(),
  description: taskFieldSchemas.description.optional(),
  expires_at: taskFieldSchemas.expires_at
    .nullable()
    .optional()
    .describe(
      `When the task expires. ${DATE_TIME_INPUT_DESCRIPTION} Null: the task never expires.`,
    ),
  repeatable: taskFieldSchemas.repeatable.optional(),
  reward_silc_value: taskFieldSchemas.reward_silc_value
    .optional()
    .describe(
      "The SILC for each completionist. Only for a task with a silc or new_silc reward; a new_silc reward needs the permission to create new SILC.",
    ),
  reward_text: taskFieldSchemas.reward_text
    .optional()
    .describe(
      "The reward as a Markdown text. Only for a task with a text reward.",
    ),
  required_role_ids: taskFieldSchemas.required_role_ids
    .optional()
    .describe(
      "Only for a public task: the full new list of the roles of which a citizen must have one to accept the task, from list_roles.",
    ),
  hidden_for_other_roles: taskFieldSchemas.hidden_for_other_roles
    .optional()
    .describe(
      "Only for a public task: whether only the citizens with a required role can see the task.",
    ),
  assignment_limit: taskFieldSchemas.assignment_limit
    .optional()
    .describe(
      "Only for a public task: the maximum number of citizens that can accept the task, or null for no limit.",
    ),
  assignee_ids: taskFieldSchemas.assignee_ids
    .optional()
    .describe(
      "Only for a public task: the full new list of the citizens who accepted the task, from a Spynet tool. The citizens that are not in the list lose their assignment.",
    ),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

/**
 * The change of one field group: the per-field forms of the task page each
 * change one group, and each group writes its own audit event
 */
interface TaskChange {
  readonly data: Prisma.TaskUpdateInput;
  readonly auditEvent: AuditEventInput;
  readonly notification?: Notification;
}

/**
 * The system log keeps one event type for each SILC reward type, because it
 * had one value column for each type before
 */
const getSilcRewardAuditEventType = (task: VisibleTask) => {
  switch (task.rewardType) {
    case TaskRewardType.SILC:
      return AuditEventType.TASK_REWARD_SILC_UPDATED;

    case TaskRewardType.NEW_SILC:
      return AuditEventType.TASK_REWARD_NEW_SILC_UPDATED;

    // The reward CHECK constraint refuses a SILC value on a text reward
    case TaskRewardType.TEXT:
      throw new ValidationError(TaskErrorMessage.TextRewardOnly);

    default:
      throw new Error(
        `Unknown task reward type: ${task.rewardType satisfies never}`,
      );
  }
};

/** The assignments that the new list of assignees adds and removes */
const getAssignmentWrites = (
  task: VisibleTask,
  assigneeIds: readonly string[],
  createdById: string,
): Prisma.TaskUpdateInput["assignments"] => {
  const newAssigneeIds = new Set(assigneeIds);
  const currentAssigneeIds = new Set(
    task.assignments.map((assignment) => assignment.citizenId),
  );

  return {
    deleteMany: {
      citizenId: {
        in: [...currentAssigneeIds].filter(
          (citizenId) => !newAssigneeIds.has(citizenId),
        ),
      },
    },
    createMany: {
      data: [...newAssigneeIds]
        .filter((citizenId) => !currentAssigneeIds.has(citizenId))
        .map((citizenId) => ({ citizenId, createdById })),
    },
  };
};

const getTaskChanges = (
  task: VisibleTask,
  input: UpdateTaskInput,
  actor: Actor,
): TaskChange[] => {
  const taskId = task.id;
  const changes: TaskChange[] = [];

  if (input.title !== undefined)
    changes.push({
      data: { title: input.title },
      auditEvent: {
        type: AuditEventType.TASK_TITLE_UPDATED,
        data: { taskId, previousTitle: task.title, newTitle: input.title },
        createdById: actor.userId,
      },
    });

  if (input.description !== undefined)
    changes.push({
      data: { description: input.description },
      auditEvent: {
        type: AuditEventType.TASK_DESCRIPTION_UPDATED,
        data: {
          taskId,
          previousDescription: task.description,
          newDescription: input.description,
        },
        createdById: actor.userId,
      },
    });

  if (input.expires_at !== undefined) {
    const expiresAt = input.expires_at;
    changes.push({
      data: { expiresAt },
      auditEvent: {
        type: AuditEventType.TASK_EXPIRES_AT_UPDATED,
        data: {
          taskId,
          previousExpiresAt: task.expiresAt,
          newExpiresAt: expiresAt,
        },
        createdById: actor.userId,
      },
    });
  }

  if (input.repeatable !== undefined)
    changes.push({
      data: { repeatable: input.repeatable },
      auditEvent: {
        type: AuditEventType.TASK_REPEATABLE_UPDATED,
        data: {
          taskId,
          previousRepeatable: task.repeatable,
          newRepeatable: input.repeatable,
        },
        createdById: actor.userId,
      },
    });

  if (input.reward_silc_value !== undefined)
    changes.push({
      data: { rewardSilcValue: input.reward_silc_value },
      auditEvent: {
        type: getSilcRewardAuditEventType(task),
        data: {
          taskId,
          previousValue: task.rewardSilcValue,
          newValue: input.reward_silc_value,
        },
        createdById: actor.userId,
      },
    });

  if (input.reward_text !== undefined) {
    // The reward CHECK constraint refuses a text on a SILC reward
    if (task.rewardType !== TaskRewardType.TEXT)
      throw new ValidationError(TaskErrorMessage.SilcRewardOnly);

    changes.push({
      data: { rewardTypeTextValue: input.reward_text },
      auditEvent: {
        type: AuditEventType.TASK_REWARD_TEXT_UPDATED,
        data: {
          taskId,
          previousValue: task.rewardTypeTextValue,
          newValue: input.reward_text,
        },
        createdById: actor.userId,
      },
    });
  }

  if (
    input.required_role_ids !== undefined ||
    input.hidden_for_other_roles !== undefined
  )
    changes.push({
      data: {
        requiredRoles: input.required_role_ids && {
          set: [...new Set(input.required_role_ids)].map((roleId) => ({
            id: roleId,
          })),
        },
        hiddenForOtherRoles: input.hidden_for_other_roles,
      },
      auditEvent: {
        type: AuditEventType.TASK_REQUIRED_ROLES_UPDATED,
        data: { taskId },
        createdById: actor.userId,
      },
    });

  if (input.assignment_limit !== undefined || input.assignee_ids !== undefined)
    changes.push({
      data: {
        assignmentLimit: input.assignment_limit,
        assignments:
          input.assignee_ids &&
          getAssignmentWrites(
            task,
            input.assignee_ids,
            requireCitizen(actor).id,
          ),
      },
      auditEvent: {
        type: AuditEventType.TASK_ASSIGNMENTS_UPDATED,
        data: { taskId },
        createdById: actor.userId,
      },
      notification: { type: "TaskAssignmentUpdated", payload: { taskId } },
    });

  return changes;
};

/**
 * The checks of the fields that the forms of the task page check with their
 * choices: the forms of the assignees, the assignment limit and the required
 * roles exist only for a public task, the pickers offer the citizens that
 * are not deleted and the roles that the actor can see, and only a creator
 * of new SILC changes a reward of new SILC
 */
const requireAllowedChanges = async (
  context: ApplicationContext,
  actor: Actor,
  task: VisibleTask,
  input: UpdateTaskInput,
) => {
  const changesPublicFields =
    input.assignee_ids !== undefined ||
    input.assignment_limit !== undefined ||
    input.required_role_ids !== undefined ||
    input.hidden_for_other_roles !== undefined;
  if (changesPublicFields && task.visibility !== TaskVisibility.PUBLIC)
    throw new ValidationError(TaskErrorMessage.OnlyForPublicTask);

  if (
    input.reward_silc_value !== undefined &&
    task.rewardType === TaskRewardType.NEW_SILC
  )
    requirePermission(actor, "task", "create", [
      { key: "taskRewardType", value: TaskRewardType.NEW_SILC },
    ]);

  // Only the new entries: an entry that the task has already can stay
  if (input.assignee_ids) {
    const currentAssigneeIds = new Set(
      task.assignments.map((assignment) => assignment.citizenId),
    );
    await requireActiveCitizens(
      context,
      input.assignee_ids.filter(
        (citizenId) => !currentAssigneeIds.has(citizenId),
      ),
      TaskErrorMessage.UnknownAssignee,
    );
  }
  if (input.required_role_ids) {
    const currentRoleIds = new Set(task.requiredRoles.map((role) => role.id));
    await requireVisibleRoles(
      context,
      actor,
      input.required_role_ids.filter((roleId) => !currentRoleIds.has(roleId)),
      TaskErrorMessage.UnknownRequiredRole,
    );
  }
};

/**
 * Changes the given fields of an open task. Requires `task;read`, a citizen,
 * and that the actor created the task or has `task;manage`. Each changed
 * field group writes its audit event; a change of the assignments notifies
 * the assignees.
 */
export const updateTask = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateTaskInput,
): Promise<NotifyingTaskWriteOutput> =>
  withSpan(context, "updateTask", async () => {
    const task = await requireManageableTask(context, actor, input.task_id);
    await requireAllowedChanges(context, actor, task, input);

    const changes = getTaskChanges(task, input, actor);
    if (changes.length <= 0)
      throw new ValidationError(TaskErrorMessage.NoChange);

    await context.prisma.task.update({
      where: { id: task.id },
      data: changes.reduce<Prisma.TaskUpdateInput>(
        (data, change) => ({ ...data, ...change.data }),
        {},
      ),
    });

    await context.audit.create(changes.map((change) => change.auditEvent));

    const notifications = changes.flatMap(
      (change) => change.notification ?? [],
    );
    const notificationsSent =
      notifications.length <= 0 ||
      (await triggerNotificationsAfterSave(context, notifications));

    return {
      task: await findTaskOutput(context, actor, task.id),
      notifications_sent: notificationsSent,
    };
  });
