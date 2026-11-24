import { AuditEventType, buildPositionTree } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, ValidationError } from "../errors.js";
import { isLineupVisible } from "../events/eventManageRules.js";
import { canActorSeeEvent } from "../events/eventVisibility.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { clonePositions, findClonablePositions } from "./lineupClone.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import {
  LINEUP_EVENT_SELECT,
  requireManageableEventLineup,
} from "./lineupGuards.js";
import type { LineupCopyOutput } from "./lineupOutput.js";

export const copyEventLineupInputSchema = z.object({
  target_event_id: idSchema,
  source_event_id: idSchema,
});

export type CopyEventLineupInput = z.infer<typeof copyEventLineupInputSchema>;

/**
 * The actor must be able to see the lineup of the source, as on the lineup
 * page
 */
export const copyEventLineup = (
  context: ApplicationContext,
  actor: Actor,
  input: CopyEventLineupInput,
): Promise<LineupCopyOutput> =>
  withSpan(context, "copyEventLineup", async () => {
    requireCitizen(actor);

    const targetEvent = await requireManageableEventLineup(
      context,
      actor,
      input.target_event_id,
    );

    const sourceEvent = await context.prisma.event.findUnique({
      where: { id: input.source_event_id, deletedAt: null },
      select: LINEUP_EVENT_SELECT,
    });
    if (!sourceEvent || !canActorSeeEvent(actor, sourceEvent))
      throw new ValidationError(LineupErrorMessage.SourceEventNotFound);

    requirePermission(actor, "event", "read");
    if (!isLineupVisible(actor, sourceEvent))
      throw new ForbiddenError("The lineup of the source event is not enabled");

    const sourcePositions = await findClonablePositions(context, {
      eventId: sourceEvent.id,
      templateId: null,
    });

    const createdPositions = await context.prisma.$transaction(
      async (transaction) =>
        clonePositions(transaction, buildPositionTree(sourcePositions), {
          columns: { eventId: targetEvent.id, templateId: null },
          parentPositionId: null,
          /**
           * The number of top-level positions. After a deletion, the copy
           * can share an order with a position of the target.
           */
          startOrder: await transaction.eventPosition.count({
            where: { eventId: targetEvent.id, parentPositionId: null },
          }),
        }),
    );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_LINEUP_COPIED,
        data: { sourceEventId: sourceEvent.id, targetEventId: targetEvent.id },
        createdById: actor.userId,
      },
    ]);

    return { position_count: createdPositions.size };
  });
