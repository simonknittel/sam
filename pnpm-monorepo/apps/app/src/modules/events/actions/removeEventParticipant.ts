"use server";

import {
  createUseCaseAction,
  notificationsFailedWarning,
} from "@/modules/application";
import {
  removeEventParticipants,
  removeEventParticipantsInputSchema,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const removeEventParticipant = createUseCaseAction({
  name: "removeEventParticipant",
  schema: removeEventParticipantsInputSchema,
  useCase: removeEventParticipants,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: [formData.get("citizenId")],
    reason: formData.get("reason") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: () => "Teilnehmer entfernt.",
  warning: notificationsFailedWarning,
});
