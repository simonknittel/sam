"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
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

/**
 * The use case takes the details. The cover image is only in the app: without
 * it, the cover stays.
 */
const schema = updateEventTemplateInputSchema.extend({
  coverImageId: z.union([idSchema, z.literal(NO_COVER)]).optional(),
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
    /**
     * For the tiles "Stammdaten" and "Sichtbarkeit": the fields that the form
     * does not have stay. The switches and the Discord publishing have their
     * own actions, because their forms send nothing for "off".
     */
    parseFormData: (formData) => {
      const { name, description, visibility, visibility_role_ids } =
        parseEventDetailsFormData(formData);

      return {
        template_id: formData.get("templateId"),
        name,
        description,
        coverImageId: formData.get("coverImageId") ?? undefined,
        visibility,
        visibility_role_ids,
      };
    },
  },
);
