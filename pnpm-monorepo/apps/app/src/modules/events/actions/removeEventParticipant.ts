"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { EventActivityType, EventSource } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEventActivity } from "../utils/eventActivity";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  eventId: z.cuid(),
  citizenId: z.cuid(),
  reason: z.string().trim().max(500).optional(),
});

export const removeEventParticipant = createAuthenticatedAction(
  "removeEventParticipant",
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
      return { error: t("Common.forbidden"), requestPayload: formData };

    const participant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_activeCitizenId: {
          eventId: event.id,
          activeCitizenId: data.citizenId,
        },
      },
    });
    if (!participant)
      return {
        error: "Der Citizen ist nicht angemeldet.",
        requestPayload: formData,
      };

    /**
     * Soft-cancel the participation with the manager as the canceller — the
     * only thing on the row telling a manager removal from a self-cancel.
     * The side effects mirror `cancelEventParticipation` exactly.
     */
    const reason = data.reason || null;

    await prisma.$transaction(async (transaction) => {
      await transaction.eventParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          cancelledAt: new Date(),
          cancelledById: authentication.session.entity?.id ?? null,
          activeCitizenId: null,
          activeDiscordUserId: null,
        },
      });

      await transaction.eventPositionApplication.deleteMany({
        where: {
          position: {
            eventId: event.id,
          },
          citizenId: data.citizenId,
        },
      });

      await transaction.eventPosition.updateMany({
        where: {
          eventId: event.id,
          citizenId: data.citizenId,
        },
        data: {
          citizenId: null,
        },
      });

      await createEventActivity(transaction, {
        eventId: event.id,
        citizenId: authentication.session.entity?.id ?? null,
        type: EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER,
        payload: { citizenId: data.citizenId, reason },
      });
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_PARTICIPANT_REMOVED_BY_MANAGER,
        data: {
          eventId: event.id,
          citizenId: data.citizenId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "EventParticipationRemoved",
        payload: {
          eventId: event.id,
          citizenId: data.citizenId,
          reason,
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
      success: "Teilnehmer entfernt.",
    };
  },
);
