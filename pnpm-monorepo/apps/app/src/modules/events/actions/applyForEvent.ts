"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  applyForEventInputSchema,
  applyForEvent as applyForEventUseCase,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const applyForEvent = createUseCaseAction({
  name: "applyForEvent",
  schema: applyForEventInputSchema,
  useCase: applyForEventUseCase,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    comment: formData.get("comment") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () =>
    "Teilnahme angefragt. Ein Manager entscheidet über deine Anfrage.",
});
