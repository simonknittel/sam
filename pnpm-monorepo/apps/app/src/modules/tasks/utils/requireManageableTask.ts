import type { Task } from "@sam-monorepo/database/client";
import type { getTranslations } from "next-intl/server";
import { getTaskById } from "../queries/getTaskById";
import { isAllowedToManageTask } from "./isAllowedToTask";
import { rejectClosedTask } from "./rejectClosedTask";

export type ManageableTask = NonNullable<
  Awaited<ReturnType<typeof getTaskById>>
>;

type RequireManageableTaskResult =
  | { task: ManageableTask; failure?: never }
  | {
      task?: never;
      failure: { error: string; requestPayload: FormData };
    };

/**
 * The shared guard of the task mutations: the task must exist, must still
 * be open (see `rejectClosedTask`), and the current user must be allowed to
 * manage it. Returns the loaded task, or the error response the action
 * should return as-is.
 */
export const requireManageableTask = async (
  taskId: Task["id"],
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<RequireManageableTaskResult> => {
  const task = await getTaskById(taskId);
  if (!task)
    return {
      failure: { error: "Task nicht gefunden", requestPayload: formData },
    };

  const closedTaskFailure = rejectClosedTask(task, formData);
  if (closedTaskFailure) return { failure: closedTaskFailure };

  if (!(await isAllowedToManageTask(task)))
    return {
      failure: { error: t("Common.forbidden"), requestPayload: formData },
    };

  return { task };
};
