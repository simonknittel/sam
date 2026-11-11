import { EventActivityType } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  EVENT_MAX_CITIZENS_PER_REQUEST,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { selectNewParticipantIds } from "./addableParticipants.js";
import { createEventActivity } from "./eventActivity.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import { buildInvitationAuditEvents } from "./eventInvitations.js";
import { requireManageableEvent } from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  lockParticipationEnabledEvent,
  requireParticipatableAppEvent,
} from "./participatableAppEvent.js";

export const inviteEventParticipantsInputSchema = z.object({
  event_id: idSchema,
  citizen_ids: z
    .array(idSchema)
    .max(EVENT_MAX_CITIZENS_PER_REQUEST)
    .describe(
      "The citizens to invite. Each must be able to see the event, log in and get event notifications. Citizens who are already signed up or have an open invitation are skipped.",
    ),
  message: participationTextSchema
    .optional()
    .describe("A note to each invited citizen. The notification shows it."),
});

export type InviteEventParticipantsInput = z.infer<
  typeof inviteEventParticipantsInputSchema
>;

export interface InviteEventParticipantsOutput {
  /** The event after the write, like `getEvent()` */
  readonly event: GetEventOutput;
  /** Empty when all citizens were already signed up or invited */
  readonly invited_citizen_ids: string[];
}

/**
 * A manager invites citizens to sign up for an app event. Each invited
 * citizen gets a notification, except the actor, and accepts the invitation
 * with a sign-up or declines it.
 */
export const inviteEventParticipants = (
  context: ApplicationContext,
  actor: Actor,
  input: InviteEventParticipantsInput,
): Promise<InviteEventParticipantsOutput> =>
  withSpan(context, "inviteEventParticipants", async () => {
    requirePermission(actor, "event", "read");

    const event = await requireParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );
    requireManageableEvent(context, actor, event, isAllowedToManageEvent);

    const managerId = actor.citizen?.id ?? null;

    const citizenIdsToInvite = await selectNewParticipantIds(
      context.prisma,
      event,
      input.citizen_ids,
    );

    /**
     * `skipDuplicates` skips the citizens with an open invitation: the unique
     * index of the open invitations refuses a second one. The returned rows
     * say who was actually invited.
     */
    const message = input.message || null;

    const invitations =
      citizenIdsToInvite.length > 0
        ? await context.prisma.$transaction(async (transaction) => {
            await lockParticipationEnabledEvent(transaction, event.id);

            const created =
              await transaction.eventInvitation.createManyAndReturn({
                data: citizenIdsToInvite.map((citizenId) => ({
                  eventId: event.id,
                  citizenId,
                  message,
                  createdById: managerId,
                })),
                skipDuplicates: true,
                select: { id: true, citizenId: true },
              });

            for (const invitation of created)
              await createEventActivity(transaction, {
                eventId: event.id,
                citizenId: managerId,
                type: EventActivityType.INVITATION_CREATED,
                payload: { citizenId: invitation.citizenId, message },
              });

            return created;
          })
        : [];

    if (invitations.length > 0) {
      await context.audit.create(
        buildInvitationAuditEvents(
          AuditEventType.EVENT_PARTICIPANT_INVITED,
          event.id,
          invitations,
          actor.userId,
        ),
      );

      // The actor gets no notification about the own invitation
      await triggerNotificationsAfterSave(
        context,
        invitations
          .filter((invitation) => invitation.citizenId !== managerId)
          .map((invitation) => ({
            type: "EventInvitationCreated",
            payload: { invitationId: invitation.id },
          })),
      );
    }

    return {
      event: await loadEventOutput(context, actor, event.id),
      invited_citizen_ids: invitations.map(
        (invitation) => invitation.citizenId,
      ),
    };
  });
