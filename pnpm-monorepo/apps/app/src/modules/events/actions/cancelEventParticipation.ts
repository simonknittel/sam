"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { EventActivityType } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { cancelParticipation } from "../utils/cancelParticipation";
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

    const isCancelled =
      participant !== null &&
      (await prisma.$transaction(async (transaction) => {
        if (
          !(await cancelParticipation(transaction, {
            participantId: participant.id,
            eventId: event.id,
            citizenId,
            cancelledById: citizenId,
          }))
        )
          return false;

        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.PARTICIPATION_CANCELLED,
          payload: null,
        });
        return true;
      }));

    /**
     * Also for the error below: then a different tab, a parallel request or a
     * manager cancelled the participation before, and the page must show it.
     */
    refresh();

    if (!isCancelled)
      return {
        error: "Du bist nicht angemeldet.",
        requestPayload: formData,
      };

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
     * Respond with the result
     */
    return {
      success: "Du hast dich abgemeldet.",
    };
  },
);
