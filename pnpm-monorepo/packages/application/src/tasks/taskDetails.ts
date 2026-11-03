import { ReadMarkerSubject } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import {
  toCitizenReferences,
  type CitizenReference,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { buildUnreadWhere } from "../readMarkers/unreadWhere.js";
import { isRoleVisible } from "../roles/roleVisibility.js";
import { findNewTaskIds } from "./findNewTaskIds.js";
import { TASK_DETAILS_INCLUDE, type TaskDetailsRow } from "./taskListSelect.js";
import { toTaskListItem, type TaskListItem } from "./taskOutput.js";
import {
  hasRequiredRole,
  isAllowedToManageTask,
  isTaskUpdatable,
} from "./taskRules.js";

export interface TaskRoleReference {
  readonly id: string;
  readonly name: string;
}

/** The output of `getTask` and the task in the output of the task writes */
export interface GetTaskOutput extends TaskListItem {
  /** The citizens that completed the task, without the deleted citizens */
  readonly completionists: CitizenReference[];
  /**
   * The roles that a citizen must have to accept the task. Only the roles
   * that the user can see.
   */
  readonly required_roles: TaskRoleReference[];
  /** Whether the user has one of the required roles, or no role is required */
  readonly has_required_role: boolean;
  /** Whether the user can change, complete and cancel the task */
  readonly can_manage: boolean;
  /** Whether the task is still open, thus it can change */
  readonly is_updatable: boolean;
  /** How often the task can be completed */
  readonly repeatable: number;
  /** Whether only the citizens with a required role can see the task */
  readonly hidden_for_other_roles: boolean;
  /** The maximum number of citizens that can accept the task */
  readonly assignment_limit: number | null;
}

export type VisibleTask = TaskDetailsRow & {
  /**
   * The role rule of the self-assignment, with the effective roles of the
   * citizen of the actor
   */
  readonly hasCurrentUserRequiredRole: boolean;
};

export const toVisibleTask = (
  actor: Actor,
  task: TaskDetailsRow,
): VisibleTask => ({
  ...task,
  hasCurrentUserRequiredRole: hasRequiredRole(
    task.requiredRoles,
    actor.roleIds,
  ),
});

/**
 * Loads the names of the required roles that the actor can see. The app
 * shows only these roles (see the role badges).
 */
const findReadableRoles = async (
  context: ApplicationContext,
  actor: Actor,
  roleIds: ReadonlySet<string>,
): Promise<TaskRoleReference[]> => {
  const readableRoleIds = [...roleIds].filter((roleId) =>
    isRoleVisible(actor, roleId),
  );
  if (readableRoleIds.length <= 0) return [];

  return context.prisma.role.findMany({
    where: { id: { in: readableRoleIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
};

/**
 * Maps the tasks to the output of `getTask`. The lookups of all tasks share
 * one query each.
 */
export const toTaskOutputs = async (
  context: ApplicationContext,
  actor: Actor,
  tasks: readonly VisibleTask[],
): Promise<GetTaskOutput[]> => {
  const now = context.now();
  const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Task);
  const [newTaskIdList, readableRoles] = await Promise.all([
    unreadWhere
      ? findNewTaskIds(
          context.prisma,
          tasks.map((task) => task.id),
          unreadWhere,
          now,
        )
      : [],
    findReadableRoles(
      context,
      actor,
      new Set(tasks.flatMap((task) => task.requiredRoles.map(({ id }) => id))),
    ),
  ]);
  const newTaskIds = new Set(newTaskIdList);

  return tasks.map((task) => {
    const requiredRoleIds = new Set(task.requiredRoles.map(({ id }) => id));

    return {
      ...toTaskListItem(task, { actor, now, isNew: newTaskIds.has(task.id) }),
      completionists: toCitizenReferences(task.completionists),
      required_roles: readableRoles.filter((role) =>
        requiredRoleIds.has(role.id),
      ),
      has_required_role: task.hasCurrentUserRequiredRole,
      can_manage: isAllowedToManageTask(actor, task),
      is_updatable: isTaskUpdatable(task, now),
      repeatable: task.repeatable,
      hidden_for_other_roles: task.hiddenForOtherRoles,
      assignment_limit: task.assignmentLimit,
    };
  });
};

/**
 * The output of a task after a write. The write checked the access before,
 * thus this function does not check it again.
 */
export const findTaskOutput = async (
  context: ApplicationContext,
  actor: Actor,
  taskId: string,
): Promise<GetTaskOutput> => {
  const task = await context.prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: TASK_DETAILS_INCLUDE,
  });
  const [output] = await toTaskOutputs(context, actor, [
    toVisibleTask(actor, task),
  ]);

  return output!;
};
