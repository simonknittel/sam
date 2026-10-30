"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import { parseDiscordPublishFields } from "@/modules/events/utils/discordPublishFields";
import { EVENT_ERROR_TEXTS } from "@/modules/events/utils/eventErrorTexts";
import { parseEventDetailsFormData } from "@/modules/events/utils/eventFormData";
import {
  idSchema,
  updateEventTemplateInputSchema,
  updateEventTemplate as updateEventTemplateUseCase,
  type UpdateEventTemplateOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import * as z from "zod";

/** The empty marker the cover field submits when no image is selected */
const NO_COVER = "";

/** The use case takes the details. The cover image is only in the app. */
const schema = updateEventTemplateInputSchema.extend({
  coverImageId: z.union([idSchema, z.literal(NO_COVER)]),
});

export const updateEventTemplate = createAuthenticatedAction(
  "updateEventTemplate",
  schema,
  async (formData, authentication, { coverImageId, ...input }, t) => {
    const coverImageIdOrNull = coverImageId === NO_COVER ? null : coverImageId;

    let result: UpdateEventTemplateOutput;
    try {
      result = await updateEventTemplateUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        input,
        { coverImageId: coverImageIdOrNull },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: EVENT_ERROR_TEXTS,
      });
    }

    refresh();

    if (result.cover_image_changed && coverImageIdOrNull)
      probeUploadImageDimensions(coverImageIdOrNull);

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => {
      const { name, description, visibility, visibility_role_ids } =
        parseEventDetailsFormData(formData);

      return {
        template_id: formData.get("templateId"),
        name,
        description,
        coverImageId: formData.get("coverImageId") ?? NO_COVER,
        visibility,
        visibility_role_ids,
        // The checkbox sends a value only while it is checked
        participation_enabled: formData.get("participationEnabled") === "true",
        ...parseDiscordPublishFields(formData),
      };
    },
  },
);
