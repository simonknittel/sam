import { EventSource } from "@sam-monorepo/database/browser";
import type { Citizen, Event, Prisma } from "@sam-monorepo/database/client";
import {
  withdrawOpenApplications,
  type ApplicationOfCitizen,
} from "./eventApplications.js";
import {
  withdrawOpenInvitations,
  type InvitationOfCitizen,
} from "./eventInvitations.js";

/**
 * The notification shows it as it is, thus it is German like the reasons of the
 * managers
 */
export const PARTICIPATION_DISABLED_REASON =
  "Der Organisator hat die Teilnahme an diesem Event abgeschaltet.";

interface Input {
  readonly eventId: Event["id"];
  readonly cancelledById: Citizen["id"] | null;
  readonly cancelledAt: Date;
}

export interface ClearedEventParticipation {
  readonly cancelledParticipantCount: number;
  readonly cancelledCitizenIds: string[];
  readonly clearedPositionCount: number;
  readonly deletedApplicationCount: number;
  readonly withdrawnInvitations: InvitationOfCitizen[];
  readonly withdrawnApplications: ApplicationOfCitizen[];
}

export const NO_CLEARED_EVENT_PARTICIPATION: ClearedEventParticipation = {
  cancelledParticipantCount: 0,
  cancelledCitizenIds: [],
  clearedPositionCount: 0,
  deletedApplicationCount: 0,
  withdrawnInvitations: [],
  withdrawnApplications: [],
};

/**
 * The switch of the participation of an app event to false. Like a removal by a
 * manager, the sign-ups stay as cancelled rows. The positions stay.
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

  const withdrawnInvitations = await withdrawOpenInvitations(transaction, {
    eventId,
    withdrawnById: cancelledById,
    withdrawnAt: cancelledAt,
  });

  const withdrawnApplications = await withdrawOpenApplications(transaction, {
    eventId,
    actorId: cancelledById,
    closedAt: cancelledAt,
  });

  return {
    cancelledParticipantCount: cancelledParticipants.length,
    cancelledCitizenIds: cancelledParticipants.flatMap((participant) =>
      participant.citizenId ? [participant.citizenId] : [],
    ),
    clearedPositionCount,
    deletedApplicationCount,
    withdrawnInvitations,
    withdrawnApplications,
  };
};
