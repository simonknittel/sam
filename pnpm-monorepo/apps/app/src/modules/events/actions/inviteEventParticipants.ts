"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  inviteEventParticipantsInputSchema,
  inviteEventParticipants as inviteEventParticipantsUseCase,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

/**
 * The refresh is also necessary when nobody was invited: then the citizens
 * signed up or got an invitation in the meantime, and the page must show it.
 */
export const inviteEventParticipants = createUseCaseAction({
  name: "inviteEventParticipants",
  schema: inviteEventParticipantsInputSchema,
  useCase: inviteEventParticipantsUseCase,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    citizen_ids: formData.getAll("citizenId[]"),
    message: formData.get("message") ?? undefined,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t, output) =>
    output.invited_citizen_ids.length <= 0
      ? "Alle ausgewählten Citizen sind bereits angemeldet oder eingeladen."
      : `${output.invited_citizen_ids.length} Citizen eingeladen.`,
});
