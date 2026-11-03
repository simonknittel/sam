"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  deleteEventPositionInputSchema,
  deleteLineupPosition,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

/** The lineup editor also deletes the positions of an event template */
export const deleteEventPosition = createUseCaseAction({
  name: "deleteEventPosition",
  schema: deleteEventPositionInputSchema,
  useCase: deleteLineupPosition,
  parseFormData: (formData) => ({ position_id: formData.get("id") }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullyDeleted"),
});
