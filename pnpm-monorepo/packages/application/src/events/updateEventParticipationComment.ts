import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { EventErrorMessage } from "./eventErrors.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import {
  findActiveParticipation,
  writeOwnParticipationComment,
  type EventParticipationInput,
} from "./ownParticipation.js";
import { requireOpenParticipatableAppEvent } from "./participatableAppEvent.js";

/** An empty or missing comment removes the comment */
export const updateEventParticipationComment = (
  context: ApplicationContext,
  actor: Actor,
  input: EventParticipationInput,
): Promise<GetEventOutput> =>
  withSpan(context, "updateEventParticipationComment", async () => {
    const citizenId = requireCitizen(actor).id;
    requirePermission(actor, "event", "read");

    const event = await requireOpenParticipatableAppEvent(
      context,
      actor,
      input.event_id,
    );

    const participant = await findActiveParticipation(
      context,
      event.id,
      citizenId,
    );
    /** A different tab or a manager cancelled the participation before */
    if (!participant) throw new ConflictError(EventErrorMessage.NotSignedUp);

    await writeOwnParticipationComment(context, actor, participant.id, {
      eventId: event.id,
      citizenId,
      comment: input.comment || null,
    });

    return loadEventOutput(context, actor, event.id);
  });
