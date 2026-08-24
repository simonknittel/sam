"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { EventSource } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EVENT_MANAGE_GUARD_SELECT } from "../queries/eventManageGuardSelect";
import {
  DiscordSyncOutcome,
  removeDiscordEventPublication,
} from "../utils/discordPublishing";
import { getEventPath } from "../utils/eventConstraints";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  eventId: z.cuid(),
});

export const unpublishEventFromDiscord = createAuthenticatedAction(
  "unpublishEventFromDiscord",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const event = await prisma.event.findUnique({
      where: {
        id: data.eventId,
        source: EventSource.APP,
        deletedAt: null,
      },
      select: EVENT_MANAGE_GUARD_SELECT,
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

    const result = await removeDiscordEventPublication(event.id, {
      userId: authentication.session.user.id,
      citizenId: authentication.session.entity?.id ?? null,
    });

    if (result.outcome === DiscordSyncOutcome.Failed)
      return {
        error:
          "Discord konnte nicht erreicht werden. Das Event bleibt dort vorerst veröffentlicht.",
        requestPayload: formData,
      };

    /**
     * Revalidate cache(s)
     */
    revalidatePath(getEventPath(event.id), "layout");

    return {
      success:
        result.outcome === DiscordSyncOutcome.Cleared
          ? "Das Event war auf Discord bereits gelöscht und gilt hier wieder als nicht veröffentlicht."
          : "Das Event wurde von Discord entfernt.",
    };
  },
);
