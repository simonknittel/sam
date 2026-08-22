"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { EventActivityType, EventSource } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAddableParticipantIds } from "../queries/getAddableParticipantIds";
import { createEventActivity } from "../utils/eventActivity";
import { getParticipatableAppEvent } from "../utils/getParticipatableAppEvent";
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

    const [addableCitizenIds, activeParticipants] = await Promise.all([
      getAddableParticipantIds(event, requestedCitizenIds),
      prisma.eventParticipant.findMany({
        where: {
          eventId: event.id,
          cancelledAt: null,
          activeCitizenId: { in: requestedCitizenIds },
        },
        select: { activeCitizenId: true },
      }),
    ]);

    const addable = new Set(addableCitizenIds);
    const alreadyActive = new Set(
      activeParticipants.map((participant) => participant.activeCitizenId!),
    );

    const unknownCitizenId = requestedCitizenIds.find(
      (citizenId) => !addable.has(citizenId) && !alreadyActive.has(citizenId),
    );
    if (unknownCitizenId)
      return {
        error: "Mindestens ein Citizen kann das Event nicht sehen.",
        requestPayload: formData,
      };

    const citizenIdsToAdd = requestedCitizenIds.filter(
      (citizenId) => !alreadyActive.has(citizenId),
    );
    if (citizenIdsToAdd.length <= 0)
      return { success: "Alle ausgewählten Citizen sind bereits angemeldet." };

    /**
     * Add the participants. One transaction, so a failure part-way through
     * cannot leave participations behind that never reach the audit log or
     * the affected citizens. `skipDuplicates` absorbs the one race the
     * pre-check cannot close — a citizen signing themselves up in between —
     * and the returned rows say who was actually added.
     */
    const comment = data.comment || null;

    const addedCitizenIds = await prisma.$transaction(async (transaction) => {
      const created = await transaction.eventParticipant.createManyAndReturn({
        data: citizenIdsToAdd.map((citizenId) => ({
          eventId: event.id,
          source: EventSource.APP,
          citizenId,
          activeCitizenId: citizenId,
          comment,
        })),
        skipDuplicates: true,
        select: { citizenId: true },
      });

      const citizenIds = created.map((participant) => participant.citizenId!);

      for (const citizenId of citizenIds)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId: managerId,
          type: EventActivityType.PARTICIPATION_ADDED_BY_MANAGER,
          payload: { citizenId, comment },
        });

      return citizenIds;
    });

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
