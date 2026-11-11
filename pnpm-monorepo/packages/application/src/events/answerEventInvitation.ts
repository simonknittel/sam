import { EventActivityType } from "@sam-monorepo/database/browser";
import { AuditEventType, EventInvitationAnswer } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { createEventActivity } from "./eventActivity.js";
import { EventErrorMessage } from "./eventErrors.js";
import { participationTextSchema } from "./eventInputSchemas.js";
import { OPEN_INVITATION_WHERE } from "./eventInvitationStatus.js";
import {
  buildInvitationAnsweredNotification,
  buildInvitationAuditEvents,
} from "./eventInvitations.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import { insertOwnParticipation } from "./ownParticipation.js";
import { requireOpenParticipatableAppEvent } from "./participatableAppEvent.js";
import { buildOwnSignUpNotifications } from "./participationChangeNotifications.js";

export const answerEventInvitationInputSchema = z.object({
  event_id: idSchema,
  comment: participationTextSchema
    .optional()
    .describe(
      "A note for the organizers: on accept the comment of the sign-up, for example the ship, on decline the reason.",
    ),
});

export type AnswerEventInvitationInput = z.infer<
  typeof answerEventInvitationInputSchema
>;

/**
 * Accepts the open invitation of the user to an app event: signs the user
 * up with the comment. The organizers get a notification.
 *
 * @throws ConflictError `EventErrorMessage.NoOpenInvitation` without an open
 * invitation, `EventErrorMessage.AlreadySignedUp` and the errors of an own
 * sign-up
 */
export const acceptEventInvitation = (
  context: ApplicationContext,
  actor: Actor,
  input: AnswerEventInvitationInput,
): Promise<GetEventOutput> =>
  withSpan(context, "acceptEventInvitation", async () => {
    const citizenId = requireCitizen(actor).id;
    requirePermission(actor, "event", "read");

    const event = await requireOpenParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );

    const signUp = await insertOwnParticipation(
      context,
      actor,
      {
        eventId: event.id,
        citizenId,
        comment: input.comment || null,
      },
      { requireOpenInvitation: true },
    );

    await triggerNotificationsAfterSave(
      context,
      buildOwnSignUpNotifications(event, context.now(), signUp),
    );

    return loadEventOutput(context, actor, event.id);
  });

/**
 * Declines the open invitation of the user to an app event, with an optional
 * comment. The organizers get a notification. The user can still sign up
 * later.
 *
 * @throws ConflictError `EventErrorMessage.NoOpenInvitation` without an open
 * invitation, for example when a manager withdrew it
 */
export const declineEventInvitation = (
  context: ApplicationContext,
  actor: Actor,
  input: AnswerEventInvitationInput,
): Promise<GetEventOutput> =>
  withSpan(context, "declineEventInvitation", async () => {
    const citizenId = requireCitizen(actor).id;
    requirePermission(actor, "event", "read");

    const event = await requireOpenParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );
    const comment = input.comment || null;

    const declinedInvitation = await context.prisma.$transaction(
      async (transaction) => {
        const [invitation] =
          await transaction.eventInvitation.updateManyAndReturn({
            where: { eventId: event.id, citizenId, ...OPEN_INVITATION_WHERE },
            data: {
              declinedAt: context.now(),
              declineComment: comment,
            },
            select: { id: true, citizenId: true },
          });
        if (!invitation) return null;

        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.INVITATION_DECLINED,
          payload: { comment },
        });

        return invitation;
      },
    );

    /** A different tab answered the invitation, or a manager withdrew it */
    if (!declinedInvitation)
      throw new ConflictError(EventErrorMessage.NoOpenInvitation);

    await context.audit.create(
      buildInvitationAuditEvents(
        AuditEventType.EVENT_INVITATION_DECLINED,
        event.id,
        [declinedInvitation],
        actor.userId,
      ),
    );

    await triggerNotificationsAfterSave(context, [
      buildInvitationAnsweredNotification(
        event.id,
        citizenId,
        EventInvitationAnswer.Declined,
        comment,
      ),
    ]);

    return loadEventOutput(context, actor, event.id);
  });
