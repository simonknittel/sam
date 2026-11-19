"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  withdrawEventApplicationInputSchema,
  withdrawEventApplication as withdrawEventApplicationUseCase,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const withdrawEventApplication = createUseCaseAction({
  name: "withdrawEventApplication",
  schema: withdrawEventApplicationInputSchema,
  useCase: withdrawEventApplicationUseCase,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Teilnahmeanfrage zurückgezogen.",
});
