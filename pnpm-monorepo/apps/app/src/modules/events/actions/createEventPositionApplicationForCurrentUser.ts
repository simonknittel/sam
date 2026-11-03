"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  applyForEventPosition,
  applyForEventPositionInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const createEventPositionApplicationForCurrentUser = createUseCaseAction(
  {
    name: "createEventPositionApplicationForCurrentUser",
    schema: applyForEventPositionInputSchema,
    useCase: applyForEventPosition,
    parseFormData: (formData) => ({
      position_id: formData.get("positionId"),
    }),
    texts: EVENT_ERROR_TEXTS,
    success: () =>
      "Erfolgreich gespeichert. Die Anmeldung muss vom Organisator des Events bestätigt werden.",
  },
);
