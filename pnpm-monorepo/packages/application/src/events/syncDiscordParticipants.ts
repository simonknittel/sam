import { EventSource } from "@sam-monorepo/database/browser";
import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import {
  DiscordOutcome,
  type ApplicationContext,
  type DiscordScheduledEvent,
} from "../context.js";
import { callDiscord } from "../discord/callDiscord.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { diffParticipants } from "./discordEventReconciliation.js";
import {
  buildCancellationNotifications,
  buildSignUpNotifications,
  type OwnCancellation,
} from "./participationChangeNotifications.js";

export interface SyncDiscordParticipantsOptions {
  /**
   * True for an event that this run imported. Its RSVPs are not changes of
   * the participation, thus they notify nobody.
   */
  readonly isNewEvent: boolean;
}

export interface SyncDiscordParticipantsOutput {
  /** The new RSVPs on Discord, as in `EVENT_PARTICIPANTS_SYNCED` */
  readonly addedCount: number;
  /** The withdrawn RSVPs on Discord, as in `EVENT_PARTICIPANTS_SYNCED` */
  readonly removedCount: number;
  /** The rows that got the citizen of their Discord user in this run */
  readonly linkedCount: number;
  readonly notificationsSent: boolean;
}

const findActiveCitizensByDiscordId = (
  context: ApplicationContext,
  discordIds: string[],
) =>
  context.prisma.citizen.findMany({
    where: {
      discordId: {
        in: discordIds,
      },
      ...ACTIVE_CITIZEN_WHERE,
    },
    select: {
      id: true,
      discordId: true,
    },
  });

/**
 * Makes the participants of the event from Discord agree with the users that
 * are interested in the scheduled event on Discord, and notifies the
 * organizers about the new RSVPs and the withdrawals of citizens. Gives null
 * when the database has no active row from Discord for the scheduled event.
 */
export const syncDiscordParticipants = async (
  context: ApplicationContext,
  scheduledEvent: DiscordScheduledEvent,
  { isNewEvent }: SyncDiscordParticipantsOptions,
): Promise<SyncDiscordParticipantsOutput | null> => {
  const databaseEvent = await context.prisma.event.findUnique({
    where: {
      discordId: scheduledEvent.id,
      source: EventSource.DISCORD,
      deletedAt: null,
    },
    select: {
      id: true,
      startTime: true,
    },
  });
  if (!databaseEvent) return null;

  /**
   * The sync cancels the participation of each user that is not in the
   * list. Thus a failed read stops the run before the first write of this
   * event.
   */
  const userIdsResult = await callDiscord(context, (gateway) =>
    gateway.listScheduledEventUserIds(scheduledEvent.id),
  );
  if (userIdsResult.outcome !== DiscordOutcome.Success)
    throw new Error(
      `Failed to read the users of the Discord event "${scheduledEvent.id}"`,
    );

  const activeParticipants = await context.prisma.eventParticipant.findMany({
    where: {
      eventId: databaseEvent.id,
      source: EventSource.DISCORD,
      cancelledAt: null,
    },
    select: {
      discordUserId: true,
    },
  });

  const { added, removed } = diffParticipants(
    userIdsResult.data,
    activeParticipants,
  );

  /**
   * A withdrawal soft-cancels the participation row (the unique rule for
   * the active sign-ups ignores the cancelled rows, thus a later RSVP gets a
   * new row). It also deletes the position applications of the citizen and
   * removes the citizen from the lineup positions. All in one transaction.
   * The first read gives the positions for the notifications before the
   * clearing.
   */
  let cancellations: OwnCancellation[] = [];
  if (removed.length > 0) {
    const [vacatedPositions] = await context.prisma.$transaction([
      context.prisma.eventPosition.findMany({
        where: {
          eventId: databaseEvent.id,
          citizen: {
            discordId: {
              in: removed,
            },
          },
        },
        select: {
          name: true,
          citizenId: true,
        },
      }),

      context.prisma.eventParticipant.updateMany({
        where: {
          eventId: databaseEvent.id,
          source: EventSource.DISCORD,
          cancelledAt: null,
          discordUserId: {
            in: removed,
          },
        },
        data: {
          cancelledAt: context.now(),
        },
      }),

      context.prisma.eventPositionApplication.deleteMany({
        where: {
          position: {
            eventId: databaseEvent.id,
          },
          citizen: {
            discordId: {
              in: removed,
            },
          },
        },
      }),

      context.prisma.eventPosition.updateMany({
        where: {
          eventId: databaseEvent.id,
          citizen: {
            discordId: {
              in: removed,
            },
          },
        },
        data: {
          citizenId: null,
        },
      }),
    ]);

    const withdrawnCitizens = await findActiveCitizensByDiscordId(
      context,
      removed,
    );
    cancellations = withdrawnCitizens.map((citizen) => ({
      citizenId: citizen.id,
      vacatedPositionNames: vacatedPositions
        .filter((position) => position.citizenId === citizen.id)
        .map((position) => position.name),
    }));
  }

  /**
   * Each RSVP becomes a new row, with its citizen when one exists. A citizen
   * with two Discord accounts can have an active row already: then the
   * unique rule for the active sign-ups skips the second row, thus one
   * conflict does not stop the run.
   */
  let signedUpCitizenIds: string[] = [];
  if (added.length > 0) {
    const citizens = await findActiveCitizensByDiscordId(context, added);
    const citizenIdByDiscordId = new Map(
      citizens.map((citizen) => [citizen.discordId, citizen.id]),
    );

    const createdParticipants =
      await context.prisma.eventParticipant.createManyAndReturn({
        data: added.map((discordUserId) => ({
          eventId: databaseEvent.id,
          source: EventSource.DISCORD,
          discordUserId,
          citizenId: citizenIdByDiscordId.get(discordUserId) ?? null,
        })),
        skipDuplicates: true,
        select: {
          citizenId: true,
        },
      });
    signedUpCitizenIds = createdParticipants.flatMap((participant) =>
      participant.citizenId === null ? [] : [participant.citizenId],
    );
  }

  /**
   * The citizen of a Discord user can come after the RSVP. Thus each run
   * looks for the citizens of all rows without a citizen again, also of the
   * cancelled rows, thus each row gets its citizen when one exists.
   */
  const unresolvedParticipants = await context.prisma.eventParticipant.findMany(
    {
      where: {
        eventId: databaseEvent.id,
        source: EventSource.DISCORD,
        citizenId: null,
      },
      select: {
        discordUserId: true,
      },
      distinct: ["discordUserId"],
    },
  );
  const unresolvedDiscordUserIds = unresolvedParticipants.flatMap(
    (participant) =>
      participant.discordUserId === null ? [] : [participant.discordUserId],
  );

  let linkedCount = 0;
  if (unresolvedDiscordUserIds.length > 0) {
    const citizens = await findActiveCitizensByDiscordId(
      context,
      unresolvedDiscordUserIds,
    );

    if (citizens.length > 0) {
      const results = await context.prisma.$transaction(
        citizens.map((citizen) =>
          context.prisma.eventParticipant.updateMany({
            where: {
              eventId: databaseEvent.id,
              source: EventSource.DISCORD,
              citizenId: null,
              discordUserId: citizen.discordId,
            },
            data: {
              citizenId: citizen.id,
            },
          }),
        ),
      );
      linkedCount = results.reduce((total, { count }) => total + count, 0);
    }
  }

  /**
   * A withdrawal also deletes the position applications of the citizen and
   * removes the citizen from the lineup positions. Thus the system log
   * records the sync, although it only copies Discord.
   */
  if (added.length > 0 || removed.length > 0) {
    await context.audit.create([
      {
        type: AuditEventType.EVENT_PARTICIPANTS_SYNCED,
        data: {
          eventId: databaseEvent.id,
          addedCount: added.length,
          removedCount: removed.length,
        },
        createdById: null,
      },
    ]);
  }

  const now = context.now();
  const notifications = isNewEvent
    ? []
    : [
        ...buildCancellationNotifications(databaseEvent, now, cancellations),
        ...buildSignUpNotifications(databaseEvent, now, signedUpCitizenIds),
      ];

  const notificationsSent =
    notifications.length > 0
      ? await triggerNotificationsAfterSave(context, notifications)
      : true;

  return {
    addedCount: added.length,
    removedCount: removed.length,
    linkedCount,
    notificationsSent,
  };
};
