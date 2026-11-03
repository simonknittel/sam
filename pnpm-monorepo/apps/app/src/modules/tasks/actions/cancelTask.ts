"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  cancelTaskInputSchema,
  cancelTask as cancelTaskUseCase,
} from "@sam-monorepo/application";
import { TASK_ERROR_TEXTS } from "../utils/taskErrorTexts";

export const cancelTask = createUseCaseAction({
  name: "cancelTask",
  schema: cancelTaskInputSchema,
  useCase: cancelTaskUseCase,
  parseFormData: (formData) => ({ task_id: formData.get("id") }),
  texts: TASK_ERROR_TEXTS,
  success: () => "Erfolgreich abgebrochen",
});
