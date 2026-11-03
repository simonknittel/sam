"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createTaskInputSchema,
  createTask as createTaskUseCase,
  toTaskRewardKind,
  toTaskVisibilityKind,
} from "@sam-monorepo/application";
import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/client";
import { TASK_ERROR_TEXTS } from "../utils/taskErrorTexts";

/**
 * The form sends the values of the Prisma enums, the use case takes the
 * kinds of the MCP tools
 */
const parseCreateTaskForm = (formData: FormData) => {
  const visibility = Object.values(TaskVisibility).find(
    (value) => value === formData.get("visibility"),
  );
  const rewardType = Object.values(TaskRewardType).find(
    (value) => value === formData.get("rewardType"),
  );
  const assignmentLimit = formData.get("assignmentLimit");

  return {
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    visibility: visibility && toTaskVisibilityKind(visibility),
    reward: {
      type: rewardType && toTaskRewardKind(rewardType),
      value:
        rewardType === TaskRewardType.TEXT
          ? formData.get("rewardTypeTextValue")
          : Number(formData.get("rewardSilcValue")),
    },
    // The wall time of the form, in the time zone of the organization
    expires_at: formData.get("expiresAt") || undefined,
    repeatable: Number(formData.get("repeatable")),
    assignment_limit: assignmentLimit ? Number(assignmentLimit) : null,
    required_role_ids: formData.getAll("requiredRole[]"),
    hidden_for_other_roles: formData.has("hiddenForOtherRoles"),
    assignee_ids: formData.getAll("assignedToId[]"),
    can_self_complete: formData.has("canSelfComplete"),
  };
};

export const createTask = createUseCaseAction({
  name: "createTask",
  schema: createTaskInputSchema,
  useCase: createTaskUseCase,
  parseFormData: parseCreateTaskForm,
  texts: TASK_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
