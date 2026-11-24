import { createUseCaseAction } from "@/modules/application";
import { updateTask, updateTaskInputSchema } from "@sam-monorepo/application";
import { TASK_ERROR_TEXTS } from "./taskErrorTexts";

interface Options {
  readonly parseFormData: (formData: FormData) => unknown;
}

export const createTaskUpdateAction = (
  actionName: string,
  { parseFormData }: Options,
) =>
  createUseCaseAction({
    name: actionName,
    schema: updateTaskInputSchema,
    useCase: updateTask,
    parseFormData,
    texts: TASK_ERROR_TEXTS,
    success: (t) => t("Common.successfullySaved"),
  });
