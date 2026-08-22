"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { EventActivityType } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cancelParticipation } from "../utils/cancelParticipation";
import { createEventActivity } from "../utils/eventActivity";
import { getParticipatableAppEvent } from "../utils/getParticipatableAppEvent";
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
    const event = await getParticipatableAppEvent(data.eventId);
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManageEvent(event)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const managerId = authentication.session.entity?.id ?? null;

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
     * The manager as the canceller is the only thing on the row telling a
     * manager removal from a self-cancel.
     */
    const reason = data.reason || null;

    await prisma.$transaction(async (transaction) => {
      await cancelParticipation(transaction, {
        participantId: participant.id,
        eventId: event.id,
        citizenId: data.citizenId,
        cancelledById: managerId,
      });

      await createEventActivity(transaction, {
        eventId: event.id,
        citizenId: managerId,
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
