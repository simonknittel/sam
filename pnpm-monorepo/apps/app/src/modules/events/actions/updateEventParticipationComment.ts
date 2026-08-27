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
  comment: z.string().trim().max(500).optional(),
});

export const updateEventParticipationComment = createAuthenticatedAction(
  "updateEventParticipationComment",
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
      select: {
        id: true,
      },
    });
    if (!participant)
      return {
        error: "Du bist nicht angemeldet.",
        requestPayload: formData,
      };

    /**
     * Update the comment
     */
    const comment = data.comment || null;
    await prisma.$transaction(async (transaction) => {
      await transaction.eventParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          comment,
        },
      });

      await createEventActivity(transaction, {
        eventId: event.id,
        citizenId,
        type: EventActivityType.PARTICIPATION_COMMENT_UPDATED,
        payload: { comment },
      });
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_PARTICIPATION_COMMENT_UPDATED,
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
    revalidatePath("/app/dashboard");
    revalidatePath(`/app/events/${event.id}`, "layout");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
