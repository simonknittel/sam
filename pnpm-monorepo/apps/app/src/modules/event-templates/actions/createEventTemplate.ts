"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import { EVENT_ERROR_TEXTS } from "@/modules/events/utils/eventErrorTexts";
import {
  createEventTemplateInputSchema,
  createEventTemplate as createEventTemplateUseCase,
  idSchema,
  type CreateEventTemplateOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getEventTemplatePath } from "../utils/eventTemplateConstraints";

const schema = createEventTemplateInputSchema.extend({
  coverImageId: idSchema.optional(),
});

export const createEventTemplate = createAuthenticatedAction(
  "createEventTemplate",
  schema,
  async (formData, authentication, { coverImageId, ...input }, t) => {
    let result: CreateEventTemplateOutput;
    try {
      result = await createEventTemplateUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        input,
        { coverImageId },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: EVENT_ERROR_TEXTS,
      });
    }

    refresh();

    if (coverImageId) probeUploadImageDimensions(coverImageId);

    /** The redirect also closes the modal (see `createCitizen`) */
    redirect(getEventTemplatePath(result.id));
  },
  {
    parseFormData: (formData) => ({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      coverImageId: formData.get("coverImageId") || undefined,
    }),
  },
);
