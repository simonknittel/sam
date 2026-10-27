import { EventActivityType } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  EVENT_MAX_CITIZENS_PER_REQUEST,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { cancelParticipation } from "./cancelParticipation.js";
import { createEventActivity } from "./eventActivity.js";
import { EventErrorMessage } from "./eventErrors.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import { requireManageableEvent } from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import { requireParticipatableAppEvent } from "./participatableAppEvent.js";

export const removeEventParticipantsInputSchema = z.object({
  event_id: idSchema,
  citizen_ids: z
    .array(idSchema)
    .max(EVENT_MAX_CITIZENS_PER_REQUEST)
    .describe("Citizens who are signed up for the event."),
  reason: participationTextSchema
    .optional()
    .describe(
      "Why the citizens are removed. Each citizen gets it in the notification.",
    ),
});

export type RemoveEventParticipantsInput = z.infer<
  typeof removeEventParticipantsInputSchema
>;

export interface RemoveEventParticipantsOutput {
  readonly event: GetEventOutput;
  readonly removed_citizen_ids: string[];
  /**
   * False when the participants are removed, but the notifications failed.
   * The removal stands.
   */
  readonly notifications_sent: boolean;
}

/**
 * A manager cancels the sign-ups of citizens for an app event. The position
 * applications and the lineup assignments of the citizens at the event go
 * with them, and each citizen gets a notification.
 */
export const removeEventParticipants = (
  context: ApplicationContext,
  actor: Actor,
  input: RemoveEventParticipantsInput,
): Promise<RemoveEventParticipantsOutput> =>
  withSpan(context, "removeEventParticipants", async () => {
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

    const citizenIds = Array.from(new Set(input.citizen_ids));
    if (citizenIds.length <= 0)
      throw new ValidationError(EventErrorMessage.NoCitizenSelected);

    /**
     * The unique index for active sign-ups permits one active row per citizen
     */
    const participants = await context.prisma.eventParticipant.findMany({
      where: {
        eventId: event.id,
        cancelledAt: null,
        citizenId: { in: citizenIds },
      },
      select: { id: true, citizenId: true },
    });

    /**
     * A citizen or a different manager cancelled a participation before
     */
    if (participants.length < citizenIds.length)
      throw new ConflictError(EventErrorMessage.CitizenNotSignedUp);

    /**
     * The manager as the canceller is the only thing on the row telling a
     * manager removal from a self-cancel.
     */
    const reason = input.reason || null;
    const cancelledAt = context.now();

    await context.prisma.$transaction(async (transaction) => {
      for (const participant of participants) {
        const citizenId = participant.citizenId!;

        /**
         * A parallel request cancelled the participation. The error rolls
         * back the removals of the other citizens.
         */
        if (
          !(await cancelParticipation(transaction, {
            participantId: participant.id,
            eventId: event.id,
            citizenId,
            cancelledById: managerId,
            cancelledAt,
          }))
        )
          throw new ConflictError(EventErrorMessage.CitizenNotSignedUp);

        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId: managerId,
          type: EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER,
          payload: { citizenId, reason },
        });
      }
    });

    await context.audit.create(
      citizenIds.map((citizenId) => ({
        type: AuditEventType.EVENT_PARTICIPANT_REMOVED_BY_MANAGER,
        data: {
          eventId: event.id,
          citizenId,
        },
        createdById: actor.userId,
      })),
    );

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      citizenIds.map((citizenId) => ({
        type: "EventParticipationRemoved",
        payload: {
          eventId: event.id,
          citizenId,
          reason,
        },
      })),
    );

    return {
      event: await loadEventOutput(context, actor, event.id),
      removed_citizen_ids: citizenIds,
      notifications_sent: notificationsSent,
    };
  });
