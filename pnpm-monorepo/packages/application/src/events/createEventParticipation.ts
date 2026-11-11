import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  insertOwnParticipation,
  type EventParticipationInput,
} from "./ownParticipation.js";
import { requireOpenParticipatableAppEvent } from "./participatableAppEvent.js";
import { buildOwnSignUpNotifications } from "./participationChangeNotifications.js";

/**
 * Signs the user up for an app event. Refuses a second sign-up, thus a
 * different tab cannot overwrite the comment unnoticed. See
 * `signUpForEvent()` for the variant that also updates the comment. The
 * sign-up accepts an open invitation of the user.
 */
export const createEventParticipation = (
  context: ApplicationContext,
  actor: Actor,
  input: EventParticipationInput,
): Promise<GetEventOutput> =>
  withSpan(context, "createEventParticipation", async () => {
    const citizenId = requireCitizen(actor).id;
    requirePermission(actor, "event", "read");

    const event = await requireOpenParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );

    const signUp = await insertOwnParticipation(context, actor, {
      eventId: event.id,
      citizenId,
      comment: input.comment || null,
    });

    await triggerNotificationsAfterSave(
      context,
      buildOwnSignUpNotifications(event, context.now(), signUp),
    );

    return loadEventOutput(context, actor, event.id);
  });
