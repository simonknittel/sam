import type { Task } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import { isTaskUpdatable } from "./isTaskUpdatable";

export const CLOSED_TASK_ERROR = "Der Task ist bereits abgeschlossen.";

/**
 * The guard of the task actions against a task that is not open anymore,
 * for example because a different user completed it. The refresh shows the
 * current state of the task on the page. Call it only in a server action.
 *
 * @returns The error response for a closed task, or null for an open task
 */
export const rejectClosedTask = (task: Task, formData: FormData) => {
  if (isTaskUpdatable(task)) return null;

  refresh();

  return {
    error: CLOSED_TASK_ERROR,
    requestPayload: formData,
  };
};
