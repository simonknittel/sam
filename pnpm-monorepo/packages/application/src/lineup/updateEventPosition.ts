import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireManageableEventPosition } from "./lineupGuards.js";
import { toLineupPositionOutput, type LineupPosition } from "./lineupOutput.js";
import { writeLineupPositionChange } from "./lineupWrites.js";
import { positionChangeSchema } from "./positionFields.js";

export const updateEventPositionInputSchema = z.object({
  position_id: idSchema.describe(
    "A position of the lineup of an event (from get_event_lineup).",
  ),
  ...positionChangeSchema.shape,
});

export type UpdateEventPositionInput = z.infer<
  typeof updateEventPositionInputSchema
>;

/**
 * Changes the given fields of a position of the lineup of an event that the
 * actor manages
 */
export const updateEventPosition = (
  context: ApplicationContext,
  actor: Actor,
  { position_id: positionId, ...change }: UpdateEventPositionInput,
): Promise<LineupPosition> =>
  withSpan(context, "updateEventPosition", async () => {
    const { position, event } = await requireManageableEventPosition(
      context,
      actor,
      positionId,
    );

    const updatedPosition = await writeLineupPositionChange(
      context,
      actor,
      position,
      change,
    );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_POSITION_UPDATED_V2,
        data: { eventId: event.id, ...updatedPosition },
        createdById: actor.userId,
      },
    ]);

    return toLineupPositionOutput(context, actor, position.id, true);
  });
