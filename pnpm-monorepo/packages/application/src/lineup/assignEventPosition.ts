import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ValidationError } from "../errors.js";
import { lockParticipationEnabledEvent } from "../events/participatableAppEvent.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import { requireManageableEventPosition } from "./lineupGuards.js";
import { toLineupPositionOutput, type LineupPosition } from "./lineupOutput.js";

export const assignEventPositionInputSchema = z.object({
  position_id: idSchema.describe(
    "A position of the lineup of an event (from get_event_lineup).",
  ),
  citizen_id: idSchema
    .nullable()
    .describe(
      "A participant of the event (from get_event) or a citizen who applied for the position (from get_event_lineup). Null removes the assigned citizen.",
    ),
});

export type AssignEventPositionInput = z.infer<
  typeof assignEventPositionInputSchema
>;

/**
 * The citizen of an assignment: an active participant of the event or an
 * applicant for the position, like the choices of the lineup page. A
 * participation from Discord without a citizen matches the Discord id of
 * the citizen (see `buildParticipantCitizenWhere()`).
 *
 * @throws ValidationError when the citizen does not exist or is deleted
 * @throws ConflictError when the citizen neither participates nor applied
 */
const requireAssignableCitizen = async (
  context: ApplicationContext,
  { eventId, positionId }: { eventId: string; positionId: string },
  citizenId: string,
) => {
  const citizen = await context.prisma.citizen.findFirst({
    where: { id: citizenId, ...ACTIVE_CITIZEN_WHERE },
    select: { id: true, discordId: true },
  });
  if (!citizen) throw new ValidationError(LineupErrorMessage.CitizenNotFound);

  const [participant, application] = await Promise.all([
    context.prisma.eventParticipant.findFirst({
      where: {
        eventId,
        cancelledAt: null,
        OR: [
          { citizenId: citizen.id },
          ...(citizen.discordId
            ? [{ citizenId: null, discordUserId: citizen.discordId }]
            : []),
        ],
      },
      select: { id: true },
    }),
    context.prisma.eventPositionApplication.findUnique({
      where: { positionId_citizenId: { positionId, citizenId: citizen.id } },
      select: { id: true },
    }),
  ]);
  if (!participant && !application)
    throw new ConflictError(LineupErrorMessage.CitizenNotParticipating);

  return citizen;
};

/**
 * Assigns a citizen to a position of the lineup of an event that the actor
 * manages, or removes the assigned citizen. The citizen must participate in
 * the event or apply for the position.
 */
export const assignEventPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: AssignEventPositionInput,
): Promise<LineupPosition> =>
  withSpan(context, "assignEventPosition", async () => {
    const { position, event } = await requireManageableEventPosition(
      context,
      actor,
      input.position_id,
    );

    if (input.citizen_id === null) {
      await context.prisma.eventPosition.update({
        where: { id: position.id },
        data: { citizen: { disconnect: true } },
      });

      if (position.citizenId)
        await context.audit.create([
          {
            type: AuditEventType.EVENT_POSITION_CITIZEN_REMOVED,
            data: {
              eventId: event.id,
              positionId: position.id,
              previousCitizenId: position.citizenId,
            },
            createdById: actor.userId,
          },
        ]);
    } else {
      const citizen = await requireAssignableCitizen(
        context,
        { eventId: event.id, positionId: position.id },
        input.citizen_id,
      );

      /**
       * The lock keeps a switch of the participation to false from clearing
       * the assignments before this one. A removal needs no lock: the
       * switch removes the citizen too.
       */
      await context.prisma.$transaction(async (transaction) => {
        await lockParticipationEnabledEvent(transaction, event.id);

        await transaction.eventPosition.update({
          where: { id: position.id },
          data: { citizen: { connect: { id: citizen.id } } },
        });
      });

      await context.audit.create([
        {
          type: AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED,
          data: {
            eventId: event.id,
            positionId: position.id,
            citizenId: citizen.id,
          },
          createdById: actor.userId,
        },
      ]);
    }

    return toLineupPositionOutput(context, position.id, true);
  });
