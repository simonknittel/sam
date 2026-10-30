import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import {
  isAllowedToManagePositions,
  isLineupVisible,
} from "../events/eventManageRules.js";
import { findVisibleEvent } from "../events/findVisibleEvent.js";
import { requireParticipationEnabled } from "../events/participatableAppEvent.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  toEventLineupOutput,
  type GetEventLineupOutput,
} from "./lineupOutput.js";

export const getEventLineupInputSchema = z.object({
  event_id: idSchema,
});

export type GetEventLineupInput = z.infer<typeof getEventLineupInputSchema>;

/**
 * The lineup of an event: the position tree with the required variants, the
 * assignees and, for a manager of the positions, the applications. The same
 * checks as the lineup page of the app: a citizen, `event;read`, `ship;read`
 * (the page shows the own ships of the required variants), the visibility of
 * the event, a participation that is not turned off, and a lineup that is
 * enabled or that the actor can manage.
 */
export const getEventLineup = (
  context: ApplicationContext,
  actor: Actor,
  input: GetEventLineupInput,
): Promise<GetEventLineupOutput> =>
  withSpan(context, "getEventLineup", async () => {
    requirePermission(actor, "event", "read");
    requirePermission(actor, "ship", "read");
    requireCitizen(actor);

    const event = await findVisibleEvent(context, actor, input.event_id);
    requireParticipationEnabled(event);

    if (!isLineupVisible(actor, event))
      throw new ForbiddenError("The lineup of the event is not enabled");

    return toEventLineupOutput(
      context,
      event,
      isAllowedToManagePositions(actor, event),
    );
  });
