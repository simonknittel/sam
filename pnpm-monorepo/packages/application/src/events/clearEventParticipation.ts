import { EventSource } from "@sam-monorepo/database/browser";
import type { Citizen, Event, Prisma } from "@sam-monorepo/database/client";

/**
 * The reason of the "removed from the event" notification of each citizen
 * whose sign-up the switch to false cancelled. The notification shows it as
 * it is, thus it is German like the reasons of the managers.
 */
export const PARTICIPATION_DISABLED_REASON =
  "Der Organisator hat die Teilnahme an diesem Event abgeschaltet.";

interface Input {
  readonly eventId: Event["id"];
  /** The acting manager, like on a removal by a manager */
  readonly cancelledById: Citizen["id"] | null;
  readonly cancelledAt: Date;
}

export interface ClearedEventParticipation {
  readonly cancelledParticipantCount: number;
  /** The citizens of the cancelled sign-ups */
  readonly cancelledCitizenIds: string[];
  readonly clearedPositionCount: number;
  readonly deletedApplicationCount: number;
}

export const NO_CLEARED_EVENT_PARTICIPATION: ClearedEventParticipation = {
  cancelledParticipantCount: 0,
  cancelledCitizenIds: [],
  clearedPositionCount: 0,
  deletedApplicationCount: 0,
};

/**
 * The switch of the participation of an app event to false: soft-cancels
 * all active sign-ups (like a removal by a manager, the rows stay as
 * history), removes the assigned citizens of all positions and deletes all
 * applications. The positions stay. Takes the transaction client, thus the
 * change of the switch and the activity entry commit together with all of
 * it.
 */
export const clearEventParticipation = async (
  transaction: Prisma.TransactionClient,
  { eventId, cancelledById, cancelledAt }: Input,
): Promise<ClearedEventParticipation> => {
  const cancelledParticipants =
    await transaction.eventParticipant.updateManyAndReturn({
      where: {
        eventId,
        source: EventSource.APP,
        cancelledAt: null,
      },
      data: {
        cancelledAt,
        cancelledById,
      },
      select: { citizenId: true },
    });

  const { count: clearedPositionCount } =
    await transaction.eventPosition.updateMany({
      where: {
        eventId,
        citizenId: { not: null },
      },
      data: {
        citizenId: null,
      },
    });

  const { count: deletedApplicationCount } =
    await transaction.eventPositionApplication.deleteMany({
      where: {
        position: {
          eventId,
        },
      },
    });

  return {
    cancelledParticipantCount: cancelledParticipants.length,
    cancelledCitizenIds: cancelledParticipants.flatMap((participant) =>
      participant.citizenId ? [participant.citizenId] : [],
    ),
    clearedPositionCount,
    deletedApplicationCount,
  };
};
