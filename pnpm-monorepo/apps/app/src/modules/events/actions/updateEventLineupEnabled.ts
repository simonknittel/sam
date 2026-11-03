"use server";

import { createUseCaseAction } from "@/modules/application";
import { updateEvent, updateEventInputSchema } from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const updateEventLineupEnabled = createUseCaseAction({
  name: "updateEventLineupEnabled",
  schema: updateEventInputSchema,
  useCase: updateEvent,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    // The checkbox sends a value only while it is checked
    lineup_enabled: Boolean(formData.get("value")),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
