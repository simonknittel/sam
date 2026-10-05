"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { EventActivityType, EventSource } from "@sam-monorepo/database/client";
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

export const signUpForEvent = createAuthenticatedAction(
  "signUpForEvent",
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

    /**
     * Create a fresh participation row. The unique index for active sign-ups
     * rejects a second active sign-up.
     */
    const comment = data.comment || null;
    try {
      await prisma.$transaction(async (transaction) => {
        await transaction.eventParticipant.create({
          data: {
            eventId: event.id,
            source: EventSource.APP,
            citizenId,
            comment,
          },
        });

        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.PARTICIPATION_SIGNED_UP,
          payload: { comment },
        });
      });
    } catch (error) {
      /** The unique index found the sign-up of a different tab */
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
        return rejectConflict("Du bist bereits angemeldet.", formData);
      throw error;
    }

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_PARTICIPATION_SIGNED_UP,
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
      success: "Du bist angemeldet.",
    };
  },
);
