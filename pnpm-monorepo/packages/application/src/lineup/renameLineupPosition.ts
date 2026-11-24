import { MAXIMUM_POSITION_NAME_LENGTH } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { buildPositionNameUpdatedAuditEvent } from "./lineupAuditEvents.js";
import { requireEditableLineupContainer } from "./lineupContainerGuard.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import { findLineupPosition } from "./lineupWrites.js";

/**
 * Different from `newPositionFieldsSchema`, an empty name passes. This is a
 * known defect.
 */
export const renameLineupPositionInputSchema = z.object({
  position_id: idSchema,
  name: z.string().trim().max(MAXIMUM_POSITION_NAME_LENGTH),
});

export type RenameLineupPositionInput = z.infer<
  typeof renameLineupPositionInputSchema
>;

export interface RenameLineupPositionOutput {
  readonly position_id: string;
  readonly name: string;
}

export const renameLineupPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: RenameLineupPositionInput,
): Promise<RenameLineupPositionOutput> =>
  withSpan(context, "renameLineupPosition", async () => {
    const { position, container } = await findLineupPosition(
      context,
      input.position_id,
    );
    await requireEditableLineupContainer(context, actor, container);

    await rethrowRecordNotFound(
      () =>
        context.prisma.eventPosition.update({
          where: { id: position.id },
          data: { name: input.name },
          select: { id: true },
        }),
      LineupErrorMessage.PositionNotFound,
    );

    await context.audit.create([
      buildPositionNameUpdatedAuditEvent(
        container,
        {
          positionId: position.id,
          previousName: position.name,
          newName: input.name,
        },
        actor.userId,
      ),
    ]);

    return { position_id: position.id, name: input.name };
  });
