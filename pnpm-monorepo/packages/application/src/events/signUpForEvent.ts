import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { EventErrorMessage } from "./eventErrors.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  findActiveParticipation,
  insertOwnParticipation,
  writeOwnParticipationComment,
  type EventParticipationInput,
} from "./ownParticipation.js";
import { requireOpenParticipatableAppEvent } from "./participatableAppEvent.js";
import { buildSignUpNotifications } from "./participationChangeNotifications.js";

const isAlreadySignedUp = (error: unknown) =>
  error instanceof ConflictError &&
  error.message === String(EventErrorMessage.AlreadySignedUp);

/**
 * Signs the user up for an app event, or updates the comment of the existing
 * sign-up. A second call with the same input changes nothing. Without a
 * comment, an existing sign-up keeps its comment. Only a new sign-up notifies
 * the organizers.
 */
export const signUpForEvent = (
  context: ApplicationContext,
  actor: Actor,
  input: EventParticipationInput,
): Promise<GetEventOutput> =>
  withSpan(context, "signUpForEvent", async () => {
    const citizenId = requireCitizen(actor).id;
    requirePermission(actor, "event", "read");

    const event = await requireOpenParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );
    const comment =
      input.comment === undefined ? undefined : input.comment || null;

    let participant = await findActiveParticipation(
      context,
      event.id,
      citizenId,
    );

    if (!participant) {
      try {
        await insertOwnParticipation(context, actor, {
          eventId: event.id,
          citizenId,
          comment: comment ?? null,
        });

        const notifications = buildSignUpNotifications(event, context.now(), [
          citizenId,
        ]);

        await triggerNotificationsAfterSave(context, notifications);

        return loadEventOutput(context, actor, event.id);
      } catch (error) {
        if (!isAlreadySignedUp(error)) throw error;

        // A parallel request signed the user up: update its comment
        participant = await findActiveParticipation(
          context,
          event.id,
          citizenId,
        );
        if (!participant)
          throw new ConflictError(EventErrorMessage.NotSignedUp);
      }
    }

    if (comment !== undefined && comment !== participant.comment)
      await writeOwnParticipationComment(context, actor, participant.id, {
        eventId: event.id,
        citizenId,
        comment,
      });

    return loadEventOutput(context, actor, event.id);
  });
