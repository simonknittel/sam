"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createEventParticipation,
  eventParticipationInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

/** Refuses a second sign-up, for example from a different tab */
export const signUpForEvent = createUseCaseAction({
  name: "signUpForEvent",
  schema: eventParticipationInputSchema,
  useCase: createEventParticipation,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    comment: formData.get("comment") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Du bist angemeldet.",
});
