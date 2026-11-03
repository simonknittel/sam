import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireManageableEventLineup } from "./lineupGuards.js";
import { toLineupPositionOutput, type LineupPosition } from "./lineupOutput.js";
import { insertLineupPosition } from "./lineupWrites.js";
import { newPositionFieldsSchema } from "./positionFields.js";

export const createEventPositionInputSchema = z.object({
  event_id: idSchema.describe("The event (from list_events)."),
  ...newPositionFieldsSchema.shape,
});

export type CreateEventPositionInput = z.infer<
  typeof createEventPositionInputSchema
>;

/** Adds a position to the lineup of an event that the actor manages */
export const createEventPosition = (
  context: ApplicationContext,
  actor: Actor,
  { event_id: eventId, ...fields }: CreateEventPositionInput,
): Promise<LineupPosition> =>
  withSpan(context, "createEventPosition", async () => {
    await requireManageableEventLineup(context, actor, eventId);

    const createdPosition = await insertLineupPosition(
      context,
      actor,
      { eventId, templateId: null },
      fields,
    );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_POSITION_CREATED_V2,
        data: { eventId, ...createdPosition },
        createdById: actor.userId,
      },
    ]);

    return toLineupPositionOutput(
      context,
      actor,
      createdPosition.positionId,
      true,
    );
  });
