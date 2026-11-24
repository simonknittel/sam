import {
  canPasteSubtree,
  getPositionLevels,
  getPositionSubtree,
  getSubtreeDepth,
  LINEUP_MAX_POSITIONS_PER_LEVEL,
  PastePlacement,
  type EventContainer,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { buildPositionCopiedAuditEvent } from "./lineupAuditEvents.js";
import { clonePositions, findClonablePositions } from "./lineupClone.js";
import { requireEditableLineupContainer } from "./lineupContainerGuard.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import type { LineupCopyOutput } from "./lineupOutput.js";
import { findLineupPosition } from "./lineupWrites.js";

export const pasteLineupPositionInputSchema = z.object({
  source_position_id: idSchema,
  target_position_id: idSchema,
  placement: z.enum(PastePlacement),
});

export type PasteLineupPositionInput = z.infer<
  typeof pasteLineupPositionInputSchema
>;

const isSameContainer = (first: EventContainer, second: EventContainer) =>
  first.kind === second.kind && first.id === second.id;

export const pasteLineupPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: PasteLineupPositionInput,
): Promise<LineupCopyOutput> =>
  withSpan(context, "pasteLineupPosition", async () => {
    const [source, target] = await Promise.all([
      findLineupPosition(context, input.source_position_id),
      findLineupPosition(context, input.target_position_id),
    ]);

    /**
     * The source can be an event that ended: a copy from a past event into
     * a new event is the usual case
     */
    const sourceColumns = await requireEditableLineupContainer(
      context,
      actor,
      source.container,
      { ignoreFreeze: true },
    );
    const targetColumns = await requireEditableLineupContainer(
      context,
      actor,
      target.container,
    );

    const sourcePositions = await findClonablePositions(context, sourceColumns);
    const subtree = getPositionSubtree(sourcePositions, source.position.id);
    if (!subtree) throw new NotFoundError(LineupErrorMessage.PositionNotFound);

    const targetPositions = isSameContainer(source.container, target.container)
      ? sourcePositions
      : await context.prisma.eventPosition.findMany({
          where: targetColumns,
          select: { id: true, parentPositionId: true },
        });

    const isInside = input.placement === PastePlacement.Inside;

    const targetLevel = getPositionLevels(targetPositions).get(
      target.position.id,
    );
    if (targetLevel === undefined)
      throw new NotFoundError(LineupErrorMessage.PositionNotFound);
    const parentLevel = isInside ? targetLevel : targetLevel - 1;
    if (!canPasteSubtree(parentLevel, getSubtreeDepth(subtree)))
      throw new ValidationError(LineupErrorMessage.PasteTooDeep);

    const parentPositionId = isInside
      ? target.position.id
      : target.position.parentPositionId;

    const siblingCount = await context.prisma.eventPosition.count({
      where: { ...targetColumns, parentPositionId },
    });
    if (siblingCount >= LINEUP_MAX_POSITIONS_PER_LEVEL)
      throw new ValidationError(LineupErrorMessage.TooManyPositionsOnLevel);

    const createdPositions = await context.prisma.$transaction(
      async (transaction) => {
        let startOrder: number;

        if (isInside) {
          const { _max } = await transaction.eventPosition.aggregate({
            where: { ...targetColumns, parentPositionId: target.position.id },
            _max: { order: true },
          });

          startOrder = (_max.order ?? -1) + 1;
        } else {
          startOrder = target.position.order + 1;

          await transaction.eventPosition.updateMany({
            where: {
              ...targetColumns,
              parentPositionId: target.position.parentPositionId,
              order: { gte: startOrder },
            },
            data: { order: { increment: 1 } },
          });
        }

        return clonePositions(transaction, [subtree], {
          columns: targetColumns,
          parentPositionId,
          startOrder,
        });
      },
    );

    await context.audit.create([
      buildPositionCopiedAuditEvent(
        { container: source.container, positionId: source.position.id },
        { container: target.container, positionId: target.position.id },
        {
          placement: input.placement,
          positionCount: createdPositions.size,
        },
        actor.userId,
      ),
    ]);

    return { position_count: createdPositions.size };
  });
