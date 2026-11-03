"use server";

import { createUseCaseAction } from "@/modules/application";
import { acceptTask, acceptTaskInputSchema } from "@sam-monorepo/application";
import { TASK_ERROR_TEXTS } from "../utils/taskErrorTexts";

export const createTaskAssignmentForCurrentUser = createUseCaseAction({
  name: "createTaskAssignmentForCurrentUser",
  schema: acceptTaskInputSchema,
  useCase: acceptTask,
  parseFormData: (formData) => ({ task_id: formData.get("taskId") }),
  texts: TASK_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
