"use server";

import { createUseCaseAction } from "@/modules/application";
import { updateEvent, updateEventInputSchema } from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const updateEventApplicationRequired = createUseCaseAction({
  name: "updateEventApplicationRequired",
  schema: updateEventInputSchema,
  useCase: updateEvent,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    application_required: Boolean(formData.get("value")),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
