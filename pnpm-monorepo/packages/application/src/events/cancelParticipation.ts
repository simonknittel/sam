import type {
  Citizen,
  Event,
  EventParticipant,
  Prisma,
} from "@sam-monorepo/database/client";

interface Input {
  readonly participantId: EventParticipant["id"];
  readonly eventId: Event["id"];
  readonly citizenId: Citizen["id"];
  /** The citizen themselves on a self-cancel, the manager on a removal */
  readonly cancelledById: Citizen["id"] | null;
  readonly cancelledAt: Date;
}

interface CancelParticipationOutput {
  /** The names of the lineup positions that the citizen held before */
  readonly vacatedPositionNames: string[];
}

/**
 * Soft-cancels one participation and drops everything it granted. The
 * cancelled row stays as history; the unique rule for active sign-ups
 * ignores it, thus the citizen can sign up again. Like the Discord sync on
 * an RSVP withdrawal, the citizen's position applications and lineup
 * assignments go with it. Takes the transaction client so the activity entry
 * the caller writes commits together with all of it.
 *
 * @returns null if the participation was cancelled before, for example by a
 * parallel request. Then nothing changed.
 */
export const cancelParticipation = async (
  transaction: Prisma.TransactionClient,
  { participantId, eventId, citizenId, cancelledById, cancelledAt }: Input,
): Promise<CancelParticipationOutput | null> => {
  const { count } = await transaction.eventParticipant.updateMany({
    where: {
      id: participantId,
      cancelledAt: null,
    },
    data: {
      cancelledAt,
      cancelledById,
    },
  });
  if (count === 0) return null;

  await transaction.eventPositionApplication.deleteMany({
    where: {
      position: {
        eventId,
      },
      citizenId,
    },
  });

  const vacatedPositions = await transaction.eventPosition.updateManyAndReturn({
    where: {
      eventId,
      citizenId,
    },
    data: {
      citizenId: null,
    },
    select: {
      name: true,
    },
  });

  return {
    vacatedPositionNames: vacatedPositions.map((position) => position.name),
  };
};
