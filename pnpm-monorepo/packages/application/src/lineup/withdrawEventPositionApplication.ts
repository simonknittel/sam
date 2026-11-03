import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { isAllowedToManagePositions } from "../events/eventManageRules.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import { requireApplicableEventPosition } from "./lineupGuards.js";
import { toLineupPositionOutput, type LineupPosition } from "./lineupOutput.js";

export const withdrawEventPositionApplicationInputSchema = z.object({
  position_id: idSchema.describe(
    "A position of the lineup of an event (from get_event_lineup).",
  ),
});

export type WithdrawEventPositionApplicationInput = z.infer<
  typeof withdrawEventPositionApplicationInputSchema
>;

/** Withdraws the own application for a position of an event */
export const withdrawEventPositionApplication = (
  context: ApplicationContext,
  actor: Actor,
  input: WithdrawEventPositionApplicationInput,
): Promise<LineupPosition> =>
  withSpan(context, "withdrawEventPositionApplication", async () => {
    const citizen = requireCitizen(actor);
    const position = await requireApplicableEventPosition(
      context,
      actor,
      input.position_id,
    );

    const application = await context.prisma.eventPositionApplication
      .delete({
        where: {
          positionId_citizenId: {
            positionId: position.id,
            citizenId: citizen.id,
          },
        },
        select: { id: true },
      })
      .catch((error: unknown) => {
        /**
         * A different tab or the end of the participation removed the
         * application before
         */
        if (isPrismaError(error, PrismaErrorCode.RecordNotFound))
          throw new ConflictError(LineupErrorMessage.NotApplied, {
            cause: error,
          });
        throw error;
      });

    await context.audit.create([
      {
        type: AuditEventType.EVENT_POSITION_APPLICATION_DELETED,
        data: {
          eventId: position.event.id,
          positionId: position.id,
          citizenId: citizen.id,
          applicationId: application.id,
        },
        createdById: actor.userId,
      },
    ]);

    return toLineupPositionOutput(
      context,
      actor,
      position.id,
      isAllowedToManagePositions(actor, position.event),
    );
  });
