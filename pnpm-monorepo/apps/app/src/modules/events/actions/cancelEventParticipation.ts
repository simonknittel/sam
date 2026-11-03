"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  cancelEventParticipationInputSchema,
  cancelEventParticipation as cancelEventParticipationUseCase,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const cancelEventParticipation = createUseCaseAction({
  name: "cancelEventParticipation",
  schema: cancelEventParticipationInputSchema,
  useCase: cancelEventParticipationUseCase,
  parseFormData: (formData) => ({ event_id: formData.get("eventId") }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Du hast dich abgemeldet.",
});
