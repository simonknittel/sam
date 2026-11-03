"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  assignEventPosition,
  assignEventPositionInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

/** `resetEventPositionCitizenId` removes the citizen */
const schema = assignEventPositionInputSchema.extend({
  citizen_id: assignEventPositionInputSchema.shape.citizen_id.unwrap(),
});

export const updateEventPositionCitizenId = createUseCaseAction({
  name: "updateEventPositionCitizenId",
  schema,
  useCase: assignEventPosition,
  parseFormData: (formData) => ({
    position_id: formData.get("positionId"),
    citizen_id: formData.get("citizenId"),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
