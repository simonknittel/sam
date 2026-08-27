"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  EventActivityType,
  EventSource,
  Prisma,
} from "@sam-monorepo/database/client";
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
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isParticipationOpen(event))
      return {
        error: "Die Anmeldung ist geschlossen.",
        requestPayload: formData,
      };

    /**
     * Create a fresh participation row; the active-key unique constraint
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
            activeCitizenId: citizenId,
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return {
          error: "Du bist bereits angemeldet.",
          requestPayload: formData,
        };
      throw error;
    }

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
     * Revalidate cache(s)
     */
    revalidatePath("/app/events");
    revalidatePath("/app/dashboard");
    revalidatePath(`/app/events/${event.id}`, "layout");

    /**
     * Respond with the result
     */
    return {
      success: "Du bist angemeldet.",
    };
  },
);
