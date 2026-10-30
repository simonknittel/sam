"use server";

import {
  createUseCaseAction,
  notificationsFailedWarning,
} from "@/modules/application";
import { updateEvent, updateEventInputSchema } from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const updateEventParticipationEnabled = createUseCaseAction({
  name: "updateEventParticipationEnabled",
  schema: updateEventInputSchema,
  useCase: updateEvent,
  parseFormData: (formData) => ({
    event_id: formData.get("eventId"),
    // The checkbox sends a value only while it is checked
    participation_enabled: Boolean(formData.get("value")),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
  warning: notificationsFailedWarning,
});
