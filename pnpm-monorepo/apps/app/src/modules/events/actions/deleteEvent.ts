"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { EventSource } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { serializeError } from "serialize-error";
import { z } from "zod";
import {
  DiscordSyncOutcome,
  removeDiscordEventPublication,
} from "../utils/discordPublishing";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  eventId: z.cuid(),
});

export const deleteEvent = createAuthenticatedAction(
  "deleteEvent",
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
      include: {
        managers: true,
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
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Take the event off Discord first: once the row is soft-deleted it no
     * longer surfaces anywhere the manager could retry from, so a leftover
     * guild scheduled event would advertise an event that is gone. Nothing
     * about it may stop the deletion, though — hence the catch.
     */
    const discordResult = await removeDiscordEventPublication(event.id, {
      userId: authentication.session.user.id,
      citizenId: authentication.session.entity?.id ?? null,
    }).catch((error: unknown) => {
      log.error("Failed to remove a deleted event from Discord", {
        eventId: event.id,
        error: serializeError(error),
      });
      return { outcome: DiscordSyncOutcome.Failed } as const;
    });

    /**
     * Soft-delete the event. The row stays resolvable, so the notification
     * router can still look up the event and its participants afterwards.
     */
    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_DELETED_IN_APP,
        data: {
          eventId: event.id,
          name: event.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "EventDeleted",
        payload: {
          eventId: event.id,
        },
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/events");
    revalidatePath(`/app/events/${event.id}`, "layout");

    /**
     * Respond with the result
     */
    return {
      success: "Das Event wurde gelöscht.",
      ...(discordResult.outcome === DiscordSyncOutcome.Failed
        ? {
            warning:
              "Das Event konnte nicht von Discord entfernt werden und muss dort von Hand gelöscht werden.",
          }
        : {}),
    };
  },
);
