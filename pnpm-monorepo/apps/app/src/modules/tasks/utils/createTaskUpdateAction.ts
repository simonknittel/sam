import { createUseCaseAction } from "@/modules/application";
import { updateTask, updateTaskInputSchema } from "@sam-monorepo/application";
import { TASK_ERROR_TEXTS } from "./taskErrorTexts";

interface Options {
  /** Maps the fields of the form to the input of `updateTask` */
  readonly parseFormData: (formData: FormData) => unknown;
}

/**
 * Factory for the update actions of the task page. Each form of the page
 * changes one field group of the task through the `updateTask` use case.
 */
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
