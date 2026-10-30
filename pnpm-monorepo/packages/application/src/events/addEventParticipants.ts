import { EventActivityType, EventSource } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  EVENT_MAX_CITIZENS_PER_REQUEST,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { findAddableParticipantIds } from "./addableParticipants.js";
import { createEventActivity } from "./eventActivity.js";
import { EventErrorMessage } from "./eventErrors.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import { requireManageableEvent } from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  lockParticipationEnabledEvent,
  requireParticipatableAppEvent,
} from "./participatableAppEvent.js";

export const addEventParticipantsInputSchema = z.object({
  event_id: idSchema,
  citizen_ids: z
    .array(idSchema)
    .max(EVENT_MAX_CITIZENS_PER_REQUEST)
    .describe(
      "The citizens to sign up. Each must be able to see the event, log in and get event notifications. Citizens who are already signed up are skipped.",
    ),
  comment: participationTextSchema
    .optional()
    .describe("The comment of each new sign-up."),
});

export type AddEventParticipantsInput = z.infer<
  typeof addEventParticipantsInputSchema
>;

export interface AddEventParticipantsOutput {
  readonly event: GetEventOutput;
  /** Empty when all citizens were already signed up */
  readonly added_citizen_ids: string[];
  /**
   * False when the participants are added, but the notifications failed.
   * The participants stay added.
   */
  readonly notifications_sent: boolean;
}

/**
 * A manager signs citizens up for an app event. Each added citizen gets a
 * notification.
 */
export const addEventParticipants = (
  context: ApplicationContext,
  actor: Actor,
  input: AddEventParticipantsInput,
): Promise<AddEventParticipantsOutput> =>
  withSpan(context, "addEventParticipants", async () => {
    requirePermission(actor, "event", "read");

    /**
     * Authorize the request
     */
    const event = await requireParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );
    requireManageableEvent(context, actor, event, isAllowedToManageEvent);

    const managerId = actor.citizen?.id ?? null;

    /**
     * Validate the citizens. The picker offers exactly this set, so anything
     * outside it either raced with a sign-up or bypassed the UI: citizens who
     * signed up in the meantime are skipped, the rest fails the whole batch.
     */
    const requestedCitizenIds = Array.from(new Set(input.citizen_ids));
    if (requestedCitizenIds.length <= 0)
      throw new ValidationError(EventErrorMessage.NoCitizenSelected);

    const [addableCitizenIds, activeParticipants] = await Promise.all([
      findAddableParticipantIds(context.prisma, event, requestedCitizenIds),
      context.prisma.eventParticipant.findMany({
        where: {
          eventId: event.id,
          cancelledAt: null,
          citizenId: { in: requestedCitizenIds },
        },
        select: { citizenId: true },
      }),
    ]);

    const addable = new Set(addableCitizenIds);
    const alreadyActive = new Set(
      activeParticipants.map((participant) => participant.citizenId!),
    );

    const unknownCitizenId = requestedCitizenIds.find(
      (citizenId) => !addable.has(citizenId) && !alreadyActive.has(citizenId),
    );
    if (unknownCitizenId)
      throw new ValidationError(EventErrorMessage.CitizenCannotSeeEvent);

    const citizenIdsToAdd = requestedCitizenIds.filter(
      (citizenId) => !alreadyActive.has(citizenId),
    );

    /**
     * Add the participants. One transaction, so a failure part-way through
     * cannot leave participations behind that never reach the audit log or
     * the affected citizens. `skipDuplicates` absorbs the one race the
     * pre-check cannot close — a citizen signing themselves up in between —
     * and the returned rows say who was actually added.
     */
    const comment = input.comment || null;

    const addedCitizenIds =
      citizenIdsToAdd.length > 0
        ? await context.prisma.$transaction(async (transaction) => {
            await lockParticipationEnabledEvent(transaction, event.id);

            const created =
              await transaction.eventParticipant.createManyAndReturn({
                data: citizenIdsToAdd.map((citizenId) => ({
                  eventId: event.id,
                  source: EventSource.APP,
                  citizenId,
                  comment,
                })),
                skipDuplicates: true,
                select: { citizenId: true },
              });

            const citizenIds = created.map(
              (participant) => participant.citizenId!,
            );

            for (const citizenId of citizenIds)
              await createEventActivity(transaction, {
                eventId: event.id,
                citizenId: managerId,
                type: EventActivityType.PARTICIPATION_ADDED_BY_MANAGER,
                payload: { citizenId, comment },
              });

            return citizenIds;
          })
        : [];

    if (addedCitizenIds.length <= 0)
      return {
        event: await loadEventOutput(context, actor, event.id),
        added_citizen_ids: [],
        notifications_sent: true,
      };

    await context.audit.create(
      addedCitizenIds.map((citizenId) => ({
        type: AuditEventType.EVENT_PARTICIPANT_ADDED_BY_MANAGER,
        data: {
          eventId: event.id,
          citizenId,
        },
        createdById: actor.userId,
      })),
    );

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      addedCitizenIds.map((citizenId) => ({
        type: "EventParticipationAdded",
        payload: {
          eventId: event.id,
          citizenId,
        },
      })),
    );

    return {
      event: await loadEventOutput(context, actor, event.id),
      added_citizen_ids: addedCitizenIds,
      notifications_sent: notificationsSent,
    };
  });
