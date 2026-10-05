import type { Task } from "@sam-monorepo/database/client";
import type { getTranslations } from "next-intl/server";
import { isAllowedToManageTask } from "./isAllowedToTask";
import {
  requireOpenTask,
  type OpenTask,
  type TaskGuardResult,
} from "./requireOpenTask";

export type ManageableTask = OpenTask;

/**
 * The shared guard of the task mutations: the task must exist, must still
 * be open (see `requireOpenTask`), and the current user must be allowed to
 * manage it. Returns the loaded task, or the error response the action
 * should return as-is.
 */
export const requireManageableTask = async (
  taskId: Task["id"],
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<TaskGuardResult> => {
  const result = await requireOpenTask(taskId, formData);
  if (result.failure) return result;

  if (!(await isAllowedToManageTask(result.task)))
    return {
      failure: { error: t("Common.forbidden"), requestPayload: formData },
    };

  return result;
};
