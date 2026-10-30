import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { isAllowedToManagePositions } from "../events/eventManageRules.js";
import { lockParticipationEnabledEvent } from "../events/participatableAppEvent.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import { requireApplicableEventPosition } from "./lineupGuards.js";
import { toLineupPositionOutput, type LineupPosition } from "./lineupOutput.js";

export const applyForEventPositionInputSchema = z.object({
  position_id: idSchema.describe(
    "A position of the lineup of an event (from get_event_lineup).",
  ),
});

export type ApplyForEventPositionInput = z.infer<
  typeof applyForEventPositionInputSchema
>;

/**
 * The own active participation in the event: an application needs it. A
 * participation from Discord matches the Discord account of the user.
 *
 * @throws ConflictError without a participation, usually a participation
 * that a different tab or a manager cancelled
 */
const requireOwnParticipation = async (
  context: ApplicationContext,
  actor: Actor,
  citizenId: string,
  eventId: string,
) => {
  const participant = await context.prisma.eventParticipant.findFirst({
    where: {
      eventId,
      cancelledAt: null,
      OR: [
        /**
         * Without a Discord id, `{ discordUserId: null }` would match each
         * sign-up in the app
         */
        ...(actor.discordUserId
          ? [{ discordUserId: actor.discordUserId }]
          : []),
        { citizenId },
      ],
    },
    select: { id: true },
  });
  if (!participant)
    throw new ConflictError(LineupErrorMessage.NotParticipating);
};

/**
 * Applies the own citizen for a position of an event in which the citizen
 * participates. A manager of the positions confirms the application with the
 * assignment. A repeated application changes nothing and gives the position
 * like the first one.
 */
export const applyForEventPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: ApplyForEventPositionInput,
): Promise<LineupPosition> =>
  withSpan(context, "applyForEventPosition", async () => {
    const citizen = requireCitizen(actor);
    const position = await requireApplicableEventPosition(
      context,
      actor,
      input.position_id,
    );
    await requireOwnParticipation(
      context,
      actor,
      citizen.id,
      position.event.id,
    );

    /**
     * The lock keeps a switch of the participation to false from clearing
     * the applications before this one. The unique index skips the
     * application of a different tab or call.
     */
    const [application] = await context.prisma.$transaction(
      async (transaction) => {
        await lockParticipationEnabledEvent(transaction, position.event.id);

        return transaction.eventPositionApplication.createManyAndReturn({
          data: [{ positionId: position.id, citizenId: citizen.id }],
          skipDuplicates: true,
          select: { id: true },
        });
      },
    );

    if (application)
      await context.audit.create([
        {
          type: AuditEventType.EVENT_POSITION_APPLICATION_CREATED,
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
      position.id,
      isAllowedToManagePositions(actor, position.event),
    );
  });
