"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { DISCORD_EVENT_LOCATION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";
import {
  EventDiscordPublishTarget,
  EventSource,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createDiscordEventPublication,
  getDiscordPublishError,
  resolveDiscordPublishTarget,
} from "../utils/discordPublishing";
import { getEventPath } from "../utils/eventConstraints";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

/** Field names come from the shared DiscordPublishTargetFields component */
const schema = z.object({
  eventId: z.cuid(),
  discordPublishTarget: z.enum(EventDiscordPublishTarget),
  /** Validated against the guild's own channels when the target is CHANNEL */
  discordPublishChannelId: z.string().max(64).optional(),
  discordPublishLocation: z
    .string()
    .trim()
    .max(DISCORD_EVENT_LOCATION_MAX_LENGTH)
    .optional(),
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
      include: { managers: true },
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
    const target = await resolveDiscordPublishTarget(
      {
        target: data.discordPublishTarget,
        channelId: data.discordPublishChannelId ?? null,
        location: data.discordPublishLocation ?? null,
      },
      event.id,
    );
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

    return { success: "Das Event wurde auf Discord veröffentlicht." };
  },
  {
    parseFormData: (formData) => ({
      eventId: formData.get("eventId"),
      discordPublishTarget: formData.get("discordPublishTarget"),
      discordPublishChannelId:
        formData.get("discordPublishChannelId") || undefined,
      discordPublishLocation:
        formData.get("discordPublishLocation") || undefined,
    }),
  },
);
