"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  EventActivityType,
  EventSource,
  Prisma,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAddableParticipantIds } from "../queries/getAddableParticipantIds";
import { createEventActivity } from "../utils/eventActivity";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  eventId: z.cuid(),
  citizenIds: z.array(z.cuid()).max(50), // Arbitrary (untested) limit to prevent DDoS
  comment: z.string().trim().max(500).optional(),
});

export const addEventParticipants = createAuthenticatedAction(
  "addEventParticipants",
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
        visibilityRoles: true,
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

    const managerId = authentication.session.entity?.id ?? null;

    /**
     * Validate the citizens. The picker offers exactly this set, so anything
     * outside it either raced with a sign-up or bypassed the UI: citizens who
     * signed up in the meantime are skipped, the rest fails the whole batch.
     */
    const requestedCitizenIds = Array.from(new Set(data.citizenIds));
    if (requestedCitizenIds.length <= 0)
      return {
        error: "Bitte wähle mindestens einen Citizen aus.",
        requestPayload: formData,
      };

    const addableCitizenIds = new Set(await getAddableParticipantIds(event));
    const activeCitizenIds = new Set(
      (
        await prisma.eventParticipant.findMany({
          where: {
            eventId: event.id,
            cancelledAt: null,
            activeCitizenId: { in: requestedCitizenIds },
          },
          select: { activeCitizenId: true },
        })
      ).map((participant) => participant.activeCitizenId!),
    );

    const unknownCitizenId = requestedCitizenIds.find(
      (citizenId) =>
        !addableCitizenIds.has(citizenId) && !activeCitizenIds.has(citizenId),
    );
    if (unknownCitizenId)
      return {
        error: "Mindestens ein Citizen kann das Event nicht sehen.",
        requestPayload: formData,
      };

    const citizenIdsToAdd = requestedCitizenIds.filter(
      (citizenId) => !activeCitizenIds.has(citizenId),
    );
    if (citizenIdsToAdd.length <= 0)
      return { success: "Alle ausgewählten Citizen sind bereits angemeldet." };

    /**
     * Add the participants
     */
    const comment = data.comment || null;
    const addedCitizenIds: string[] = [];

    for (const citizenId of citizenIdsToAdd) {
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
            citizenId: managerId,
            type: EventActivityType.PARTICIPATION_ADDED_BY_MANAGER,
            payload: { citizenId, comment },
          });
        });

        addedCitizenIds.push(citizenId);
      } catch (error) {
        /**
         * The citizen signed themselves up between the check above and here —
         * the active-key unique constraint caught it. Their participation is
         * the outcome we wanted, so the batch carries on without them.
         */
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          continue;
        throw error;
      }
    }

    if (addedCitizenIds.length <= 0)
      return { success: "Alle ausgewählten Citizen sind bereits angemeldet." };

    await createAuditEvents(
      addedCitizenIds.map((citizenId) => ({
        type: AuditEventType.EVENT_PARTICIPANT_ADDED_BY_MANAGER,
        data: {
          eventId: event.id,
          citizenId,
        },
        createdById: authentication.session.user.id,
      })),
    );

    /**
     * Trigger notifications
     */
    await triggerNotifications(
      addedCitizenIds.map((citizenId) => ({
        type: "EventParticipationAdded",
        payload: {
          eventId: event.id,
          citizenId,
        },
      })),
    );

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/events");
    revalidatePath(`/app/events/${event.id}`, "layout");

    /**
     * Respond with the result
     */
    return {
      success: `${addedCitizenIds.length} Teilnehmer hinzugefügt.`,
    };
  },
  {
    parseFormData: (formData) => ({
      eventId: formData.get("eventId"),
      citizenIds: formData.getAll("citizenId[]"),
      comment: formData.get("comment") ?? undefined,
    }),
  },
);
