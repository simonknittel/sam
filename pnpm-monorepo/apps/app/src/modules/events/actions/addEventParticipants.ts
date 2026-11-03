"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  addEventParticipantsInputSchema,
  addEventParticipants as addEventParticipantsUseCase,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

/**
 * The refresh is also necessary when nobody was added: then the citizens
 * signed up in the meantime, and the page must show it.
 */
export const addEventParticipants = createUseCaseAction({
  name: "addEventParticipants",
  schema: addEventParticipantsInputSchema,
  useCase: addEventParticipantsUseCase,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: formData.getAll("citizenId[]"),
    comment: formData.get("comment") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t, output) =>
    output.added_citizen_ids.length <= 0
      ? "Alle ausgewählten Citizen sind bereits angemeldet."
      : `${output.added_citizen_ids.length} Teilnehmer hinzugefügt.`,
});
