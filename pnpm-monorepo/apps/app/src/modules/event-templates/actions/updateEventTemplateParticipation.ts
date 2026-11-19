"use server";

import { createUseCaseAction } from "@/modules/application";
import { EVENT_ERROR_TEXTS } from "@/modules/events/utils/eventErrorTexts";
import {
  updateEventTemplateInputSchema,
  updateEventTemplate as updateEventTemplateUseCase,
} from "@sam-monorepo/application";

export const updateEventTemplateParticipation = createUseCaseAction({
  name: "updateEventTemplateParticipation",
  schema: updateEventTemplateInputSchema,
  useCase: updateEventTemplateUseCase,
  parseFormData: (formData) => ({
    template_id: formData.get("templateId"),
    // The checkbox sends a value only while it is checked
    participation_enabled: formData.get("participationEnabled") === "true",
    application_required: formData.get("applicationRequired") === "true",
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
