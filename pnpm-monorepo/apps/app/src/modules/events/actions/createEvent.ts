"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import {
  createEventInputSchema,
  createEvent as createEventUseCase,
  discordPublishFieldsShape,
  DiscordSyncOutcome,
  idSchema,
  type CreateEventOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { parseDiscordPublishFields } from "../utils/discordPublishFields";
import {
  DISCORD_PUBLISH_FAILED_PARAM,
  getEventPath,
} from "../utils/eventConstraints";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";
import { parseEventDetailsFormData } from "../utils/eventFormData";

const schema = createEventInputSchema.extend({
  coverImageId: idSchema.optional(),
  templateId: idSchema.optional(),
  /**
   * The prefilled cover comes from the template and is not an upload of the
   * submitter's own, so it travels as this flag instead of an upload id.
   */
  keepTemplateCover: z.boolean().optional(),
  /**
   * Absent means "do not publish". A template's preference reaches the action
   * by prefilling these fields, so clearing them in the form still wins.
   */
  ...discordPublishFieldsShape,
});

export const createEvent = createAuthenticatedAction(
  "createEvent",
  schema,
  async (formData, authentication, data, t) => {
    const {
      coverImageId,
      templateId,
      keepTemplateCover,
      discord_publish_target,
      discord_publish_channel_id,
      discord_publish_location,
      ...input
    } = data;

    let result: CreateEventOutput;
    try {
      result = await createEventUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        input,
        {
          coverImageId,
          template: templateId
            ? {
                templateId,
                copiesCover: keepTemplateCover === true && !coverImageId,
              }
            : undefined,
          discordPublication: discord_publish_target
            ? {
                target: discord_publish_target,
                channelId: discord_publish_channel_id,
                location: discord_publish_location,
              }
            : undefined,
        },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: EVENT_ERROR_TEXTS,
      });
    }
    const eventId = result.event.id;

    refresh();

    if (coverImageId) probeUploadImageDimensions(coverImageId);

    /**
     * Redirect to the created event, which also closes the modal (see
     * `createCitizen`). A failed publication never undoes the created event —
     * the event page tells the manager, who can retry from its settings.
     */
    const searchParams = new URLSearchParams();
    if (result.discord && result.discord.outcome !== DiscordSyncOutcome.Done)
      searchParams.set(DISCORD_PUBLISH_FAILED_PARAM, "1");
    const query = searchParams.toString();
    redirect(
      query ? `${getEventPath(eventId)}?${query}` : getEventPath(eventId),
    );
  },
  {
    parseFormData: (formData) => ({
      ...parseEventDetailsFormData(formData),
      participation_enabled: formData.get("participationEnabled") === "true",
      application_required: formData.get("applicationRequired") === "true",
      coverImageId: formData.get("coverImageId") || undefined,
      templateId: formData.get("templateId") || undefined,
      keepTemplateCover: formData.get("keepTemplateCover") === "1",
      ...parseDiscordPublishFields(formData),
    }),
  },
);
