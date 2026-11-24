"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  deleteFlowInputSchema,
  deleteFlow as deleteFlowUseCase,
} from "@sam-monorepo/application";

export const deleteFlow = createUseCaseAction({
  name: "deleteFlow",
  schema: deleteFlowInputSchema,
  useCase: deleteFlowUseCase,
  parseFormData: (formData) => ({ flow_id: formData.get("flowId") }),
  /** The list is where a restore starts */
  redirect: () => "/app/career/settings",
});
