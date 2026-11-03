import { EventActivityType } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { cancelParticipation } from "./cancelParticipation.js";
import { createEventActivity } from "./eventActivity.js";
import { EventErrorMessage } from "./eventErrors.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";
import { findActiveParticipation } from "./ownParticipation.js";
import { requireOpenParticipatableAppEvent } from "./participatableAppEvent.js";
import { buildCancellationNotifications } from "./participationChangeNotifications.js";

export const cancelEventParticipationInputSchema = z.object({
  event_id: idSchema,
});

export type CancelEventParticipationInput = z.infer<
  typeof cancelEventParticipationInputSchema
>;

/**
 * Cancels the own sign-up for an app event. The position applications and
 * the lineup assignments of the user at the event go with it.
 */
export const cancelEventParticipation = (
  context: ApplicationContext,
  actor: Actor,
  input: CancelEventParticipationInput,
): Promise<GetEventOutput> =>
  withSpan(context, "cancelEventParticipation", async () => {
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

    const cancellation =
      participant === null
        ? null
        : await context.prisma.$transaction(async (transaction) => {
            const result = await cancelParticipation(transaction, {
              participantId: participant.id,
              eventId: event.id,
              citizenId,
              cancelledById: citizenId,
              cancelledAt: context.now(),
            });
            if (result === null) return null;

            await createEventActivity(transaction, {
              eventId: event.id,
              citizenId,
              type: EventActivityType.PARTICIPATION_CANCELLED,
              payload: null,
            });
            return result;
          });

    /**
     * A different tab, a parallel request or a manager cancelled the
     * participation before
     */
    if (cancellation === null)
      throw new ConflictError(EventErrorMessage.NotSignedUp);

    await context.audit.create([
      {
        type: AuditEventType.EVENT_PARTICIPATION_CANCELLED,
        data: {
          eventId: event.id,
          citizenId,
        },
        createdById: actor.userId,
      },
    ]);

    const notifications = buildCancellationNotifications(event, context.now(), [
      { citizenId, vacatedPositionNames: cancellation.vacatedPositionNames },
    ]);

    await triggerNotificationsAfterSave(context, notifications);

    return loadEventOutput(context, actor, event.id);
  });
