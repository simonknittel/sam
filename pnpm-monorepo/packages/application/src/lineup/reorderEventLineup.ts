import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireManageableEventLineup } from "./lineupGuards.js";
import { lineupOrderSchema, writeLineupOrder } from "./lineupOrder.js";
import {
  toEventLineupOutput,
  type GetEventLineupOutput,
} from "./lineupOutput.js";

export const reorderEventLineupInputSchema = z.object({
  event_id: idSchema.describe("The event (from list_events)."),
  positions: lineupOrderSchema,
});

export type ReorderEventLineupInput = z.infer<
  typeof reorderEventLineupInputSchema
>;

/**
 * Sets the order and the parents of the positions of the lineup of an event
 * that the actor manages. Gives the lineup after the change.
 */
export const reorderEventLineup = (
  context: ApplicationContext,
  actor: Actor,
  input: ReorderEventLineupInput,
): Promise<GetEventLineupOutput> =>
  withSpan(context, "reorderEventLineup", async () => {
    const event = await requireManageableEventLineup(
      context,
      actor,
      input.event_id,
    );

    await writeLineupOrder(
      context,
      { eventId: event.id, templateId: null },
      input.positions,
    );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_LINEUP_ORDER_CHANGED,
        data: { eventId: event.id },
        createdById: actor.userId,
      },
    ]);

    return toEventLineupOutput(context, actor, event, true);
  });
