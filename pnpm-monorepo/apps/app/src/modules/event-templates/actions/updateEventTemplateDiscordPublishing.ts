"use server";

import { createUseCaseAction } from "@/modules/application";
import { parseDiscordPublishFields } from "@/modules/events/utils/discordPublishFields";
import { EVENT_ERROR_TEXTS } from "@/modules/events/utils/eventErrorTexts";
import {
  updateEventTemplateInputSchema,
  updateEventTemplate as updateEventTemplateUseCase,
} from "@sam-monorepo/application";

export const updateEventTemplateDiscordPublishing = createUseCaseAction({
  name: "updateEventTemplateDiscordPublishing",
  schema: updateEventTemplateInputSchema,
  useCase: updateEventTemplateUseCase,
  parseFormData: (formData) => {
    const fields = parseDiscordPublishFields(formData);

    return {
      template_id: formData.get("templateId"),
      ...fields,
      // The form has no target while the publishing is off
      discord_publish_target: fields.discord_publish_target ?? null,
    };
  },
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
