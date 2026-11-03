"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  completeTaskInputSchema,
  completeTask as completeTaskUseCase,
} from "@sam-monorepo/application";
import { TASK_ERROR_TEXTS } from "../utils/taskErrorTexts";

export const completeTask = createUseCaseAction({
  name: "completeTask",
  schema: completeTaskInputSchema,
  useCase: completeTaskUseCase,
  parseFormData: (formData) => ({
    task_id: formData.get("id"),
    completionist_ids: formData.getAll("completionistId[]"),
  }),
  texts: TASK_ERROR_TEXTS,
  success: () => "Erfolgreich abgeschlossen.",
});
