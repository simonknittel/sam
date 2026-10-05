"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { EventActivityType } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { createEventActivity } from "../utils/eventActivity";
import {
  getParticipatableAppEvent,
  isParticipationOpen,
} from "../utils/getParticipatableAppEvent";
import { rejectConflict } from "../utils/rejectConflict";

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
    if (!event) return rejectConflict("Event nicht gefunden", formData);
    if (!isParticipationOpen(event))
      return rejectConflict("Die Anmeldung ist geschlossen.", formData);

    const participant = await prisma.eventParticipant.findFirst({
      where: {
        eventId: event.id,
        citizenId,
        cancelledAt: null,
      },
      select: {
        id: true,
      },
    });
    /** A different tab or a manager cancelled the participation before */
    if (!participant)
      return rejectConflict("Du bist nicht angemeldet.", formData);

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

    refresh();

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
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
