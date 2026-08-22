import type {
  Entity,
  Event,
  EventParticipant,
  Prisma,
} from "@sam-monorepo/database/client";

interface Input {
  readonly participantId: EventParticipant["id"];
  readonly eventId: Event["id"];
  readonly citizenId: Entity["id"];
  /** The citizen themselves on a self-cancel, the manager on a removal */
  readonly cancelledById: Entity["id"] | null;
}

/**
 * Soft-cancels one participation and drops everything it granted. Nulling
 * the active keys in the same update that sets `cancelledAt` releases the
 * unique slot for a later re-sign-up, and — like the Discord sync on an RSVP
 * withdrawal — the citizen's position applications and lineup assignments go
 * with it. Takes the transaction client so the activity entry the caller
 * writes commits together with all of it.
 */
export const cancelParticipation = async (
  transaction: Prisma.TransactionClient,
  { participantId, eventId, citizenId, cancelledById }: Input,
) => {
  await transaction.eventParticipant.update({
    where: {
      id: participantId,
    },
    data: {
      cancelledAt: new Date(),
      cancelledById,
      activeCitizenId: null,
      activeDiscordUserId: null,
    },
  });

  await transaction.eventPositionApplication.deleteMany({
    where: {
      position: {
        eventId,
      },
      citizenId,
    },
  });

  await transaction.eventPosition.updateMany({
    where: {
      eventId,
      citizenId,
    },
    data: {
      citizenId: null,
    },
  });
};
