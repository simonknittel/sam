"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  EventDiscordPublishTarget,
  EventSource,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EVENT_MANAGE_GUARD_SELECT } from "../queries/eventManageGuardSelect";
import {
  discordPublishFieldsSchema,
  parseDiscordPublishFields,
} from "../utils/discordPublishFields";
import {
  createDiscordEventPublication,
  getDiscordCoverImageWarning,
  getDiscordPublishError,
  resolveDiscordPublishTarget,
} from "../utils/discordPublishing";
import { getEventPath } from "../utils/eventConstraints";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

/** Publishing always has a target, unlike the forms that merely offer one */
const schema = discordPublishFieldsSchema.extend({
  eventId: z.cuid(),
  discordPublishTarget: z.enum(EventDiscordPublishTarget),
});

export const publishEventToDiscord = createAuthenticatedAction(
  "publishEventToDiscord",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request. Publishing is part of managing an event, so it
     * needs no permission of its own.
     */
    const event = await prisma.event.findUnique({
      where: {
        id: data.eventId,
        source: EventSource.APP,
        deletedAt: null,
      },
      select: {
        ...EVENT_MANAGE_GUARD_SELECT,
        discordPublishedId: true,
      },
    });
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManageEvent(event)))
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (event.discordPublishedId)
      return {
        error: "Das Event ist bereits auf Discord veröffentlicht.",
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const target = await resolveDiscordPublishTarget(data, event.id);
    if (!target)
      return {
        error:
          "Der ausgewählte Kanal steht nicht (mehr) zur Verfügung. Lade die Seite neu.",
        requestPayload: formData,
      };

    const result = await createDiscordEventPublication(event.id, target, {
      userId: authentication.session.user.id,
      citizenId: authentication.session.entity?.id ?? null,
    });

    const error = getDiscordPublishError(result);
    if (error) return { error, requestPayload: formData };

    /**
     * Revalidate cache(s)
     */
    revalidatePath(getEventPath(event.id), "layout");

    const coverImageWarning = getDiscordCoverImageWarning(result);

    return {
      success: "Das Event wurde auf Discord veröffentlicht.",
      ...(coverImageWarning ? { warning: coverImageWarning } : {}),
    };
  },
  {
    parseFormData: (formData) => ({
      ...parseDiscordPublishFields(formData),
      eventId: formData.get("eventId"),
    }),
  },
);
