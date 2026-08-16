"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { EventActivityType } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEventActivity } from "../utils/eventActivity";
import {
  getParticipatableAppEvent,
  isParticipationOpen,
} from "../utils/getParticipatableAppEvent";

const schema = z.object({
  eventId: z.cuid(),
});

export const cancelEventParticipation = createAuthenticatedAction(
  "cancelEventParticipation",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    const citizenId = authentication.session.entity.id;

    const event = await getParticipatableAppEvent(data.eventId);
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isParticipationOpen(event))
      return {
        error: "Die Anmeldung ist geschlossen.",
        requestPayload: formData,
      };

    const participant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_activeCitizenId: {
          eventId: event.id,
          activeCitizenId: citizenId,
        },
      },
    });
    if (!participant)
      return {
        error: "Du bist nicht angemeldet.",
        requestPayload: formData,
      };

    /**
     * Soft-cancel the participation (nulling the active keys releases the
     * unique slot for a later re-sign-up) and, like the Discord sync on an
     * RSVP withdrawal, drop the citizen's position applications and lineup
     * assignments — all in one transaction.
     */
    await prisma.$transaction(async (transaction) => {
      await transaction.eventParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          cancelledAt: new Date(),
          cancelledById: citizenId,
          activeCitizenId: null,
          activeDiscordUserId: null,
        },
      });

      await transaction.eventPositionApplication.deleteMany({
        where: {
          position: {
            eventId: event.id,
          },
          citizenId,
        },
      });

      await transaction.eventPosition.updateMany({
        where: {
          eventId: event.id,
          citizenId,
        },
        data: {
          citizenId: null,
        },
      });

      await createEventActivity(transaction, {
        eventId: event.id,
        citizenId,
        type: EventActivityType.PARTICIPATION_CANCELLED,
        payload: null,
      });
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_PARTICIPATION_CANCELLED,
        data: {
          eventId: event.id,
          citizenId,
        },
        createdById: authentication.session.user.id,
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
      success: "Du hast dich abgemeldet.",
    };
  },
);
