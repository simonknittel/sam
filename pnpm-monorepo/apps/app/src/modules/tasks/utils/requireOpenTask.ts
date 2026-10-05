import type { Task } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import { getTaskById } from "../queries/getTaskById";
import { isTaskUpdatable } from "./isTaskUpdatable";

export const CLOSED_TASK_ERROR = "Der Task ist bereits abgeschlossen.";
export const TASK_NOT_FOUND_ERROR = "Task nicht gefunden";

export type OpenTask = NonNullable<Awaited<ReturnType<typeof getTaskById>>>;

export type TaskGuardResult =
  | { task: OpenTask; failure?: never }
  | {
      task?: never;
      failure: { error: string; requestPayload: FormData };
    };

/**
 * The guard of the task actions against a task that is gone or not open
 * anymore, for example because a different user deleted or completed it.
 * The refresh then shows the current state of the task on the page. Call it
 * only in a server action.
 *
 * @returns The open task, or the error response that the action returns
 */
export const requireOpenTask = async (
  taskId: Task["id"],
  formData: FormData,
): Promise<TaskGuardResult> => {
  const task = await getTaskById(taskId);
  if (task && isTaskUpdatable(task)) return { task };

  refresh();

  return {
    failure: {
      error: task ? CLOSED_TASK_ERROR : TASK_NOT_FOUND_ERROR,
      requestPayload: formData,
    },
  };
};
