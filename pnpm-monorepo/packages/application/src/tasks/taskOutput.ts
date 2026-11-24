import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/browser";
import type { Citizen, Task } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import {
  toCitizenReference,
  toCitizenReferences,
  type CitizenReference,
} from "../citizenReference.js";
import { getTaskStatus, type TaskStatus } from "./taskRules.js";

export enum TaskRewardKind {
  /** New SILC */
  NewSilc = "new_silc",
  /** A reward that is no SILC, described in a text */
  Text = "text",
}

export enum TaskVisibilityKind {
  /** The citizens who pass `hasRequiredRole()` can accept the task */
  Public = "public",
  /** One task for one assignee, whom the creator selects */
  Personalized = "personalized",
  /** One task for all assignees, whom the creator selects */
  Group = "group",
}

export interface TaskReward {
  readonly type: TaskRewardKind;
  /**
   * The SILC for each completionist (`new_silc`) or the Markdown
   * text of the reward (`text`)
   */
  readonly value: number | string | null;
}

export interface TaskListItem {
  readonly id: string;
  readonly title: string;
  /** Markdown */
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly created_at: string;
  readonly expires_at: string | null;
  /** Null when the creator is unknown or deleted */
  readonly created_by: CitizenReference | null;
  /** The citizens that accepted the task, without the deleted citizens */
  readonly assignees: CitizenReference[];
  readonly reward: TaskReward;
  readonly visibility: TaskVisibilityKind;
  readonly is_assigned_to_me: boolean;
  /** Whether the task is new for the user (see the read markers) */
  readonly is_new: boolean;
}

type CitizenRow = Pick<Citizen, "id" | "handle" | "deletedAt">;

export type TaskListItemSource = Pick<
  Task,
  | "id"
  | "title"
  | "description"
  | "createdAt"
  | "completedAt"
  | "cancelledAt"
  | "expiresAt"
  | "rewardType"
  | "rewardSilcValue"
  | "rewardTypeTextValue"
  | "visibility"
> & {
  readonly createdBy: CitizenRow | null;
  readonly assignments: readonly {
    readonly citizenId: string;
    readonly citizen: CitizenRow;
  }[];
};

export const toTaskRewardKind = (
  rewardType: TaskRewardType,
): TaskRewardKind => {
  switch (rewardType) {
    case TaskRewardType.NEW_SILC:
      return TaskRewardKind.NewSilc;

    case TaskRewardType.TEXT:
      return TaskRewardKind.Text;

    default:
      throw new Error(
        `Unknown task reward type: ${rewardType satisfies never}`,
      );
  }
};

const toTaskReward = (
  task: Pick<Task, "rewardType" | "rewardSilcValue" | "rewardTypeTextValue">,
): TaskReward => ({
  type: toTaskRewardKind(task.rewardType),
  value:
    task.rewardType === TaskRewardType.TEXT
      ? task.rewardTypeTextValue
      : task.rewardSilcValue,
});

export const toTaskVisibilityKind = (
  visibility: TaskVisibility,
): TaskVisibilityKind => {
  switch (visibility) {
    case TaskVisibility.PUBLIC:
      return TaskVisibilityKind.Public;

    case TaskVisibility.PERSONALIZED:
      return TaskVisibilityKind.Personalized;

    case TaskVisibility.GROUP:
      return TaskVisibilityKind.Group;

    default:
      throw new Error(`Unknown task visibility: ${visibility satisfies never}`);
  }
};

interface TaskListItemOptions {
  readonly actor: Actor;
  readonly now: Date;
  readonly isNew: boolean;
}

export const toTaskListItem = (
  task: TaskListItemSource,
  { actor, now, isNew }: TaskListItemOptions,
): TaskListItem => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: getTaskStatus(task, now),
  created_at: task.createdAt.toISOString(),
  expires_at: task.expiresAt?.toISOString() ?? null,
  created_by: toCitizenReference(task.createdBy),
  assignees: toCitizenReferences(
    task.assignments.map((assignment) => assignment.citizen),
  ),
  reward: toTaskReward(task),
  visibility: toTaskVisibilityKind(task.visibility),
  is_assigned_to_me: task.assignments.some(
    (assignment) => assignment.citizenId === actor.citizen?.id,
  ),
  is_new: isNew,
});
