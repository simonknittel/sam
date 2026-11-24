"use server";

import { createUseCaseAction } from "@/modules/application";
import { updateEvent, updateEventInputSchema } from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const updateEventParticipationEnabled = createUseCaseAction({
  name: "updateEventParticipationEnabled",
  schema: updateEventInputSchema,
  useCase: updateEvent,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    participation_enabled: Boolean(formData.get("value")),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
