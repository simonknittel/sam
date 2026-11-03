"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  assignEventPosition,
  assignEventPositionInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const resetEventPositionCitizenId = createUseCaseAction({
  name: "resetEventPositionCitizenId",
  schema: assignEventPositionInputSchema,
  useCase: assignEventPosition,
  parseFormData: (formData) => ({
    position_id: formData.get("positionId"),
    citizen_id: null,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
