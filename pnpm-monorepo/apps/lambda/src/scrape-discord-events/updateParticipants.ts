import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import type * as z from "zod";
import { createAuditEvents } from "../common/audit";
import { getEventUsers } from "./discord/utils/getEventUsers";
import type { eventSchema } from "./discord/utils/schemas";
import { diffParticipants } from "./reconciliation";

export const updateParticipants = async (
  discordEvent: z.infer<typeof eventSchema>,
) => {
  const databaseEvent = await prisma.event.findUnique({
    where: {
      discordId: discordEvent.id,
      source: EventSource.DISCORD,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  if (!databaseEvent) return;

  const discordEventUserIds = (await getEventUsers(discordEvent.id)).map(
    (user) => user.user_id,
  );

  const activeParticipants = await prisma.eventParticipant.findMany({
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
    discordEventUserIds,
    activeParticipants,
  );

  /**
   * A withdrawal soft-cancels the participation row (the unique rule for
   * active sign-ups ignores cancelled rows, thus a later re-RSVP gets a new
   * row) and, like before the unification, drops the citizen's position
   * applications and unassigns their lineup positions — all in one
   * transaction.
   */
  if (removed.length > 0) {
    await prisma.$transaction([
      prisma.eventParticipant.updateMany({
        where: {
          eventId: databaseEvent.id,
          source: EventSource.DISCORD,
          cancelledAt: null,
          discordUserId: {
            in: removed,
          },
        },
        data: {
          cancelledAt: new Date(),
        },
      }),

      prisma.eventPositionApplication.deleteMany({
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

      prisma.eventPosition.updateMany({
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
  }

  /**
   * Every (re-)RSVP becomes a fresh row; the citizen is resolved at write
   * time where possible. A citizen with two Discord accounts can have an
   * active row already: the unique rule for active sign-ups then skips the
   * second row, so that one conflict does not stop the whole run.
   */
  if (added.length > 0) {
    const citizens = await prisma.citizen.findMany({
      where: {
        discordId: {
          in: added,
        },
        ...ACTIVE_CITIZEN_WHERE,
      },
      select: {
        id: true,
        discordId: true,
      },
    });
    const citizenIdByDiscordId = new Map(
      citizens.map((citizen) => [citizen.discordId, citizen.id]),
    );

    await prisma.eventParticipant.createMany({
      data: added.map((discordUserId) => ({
        eventId: databaseEvent.id,
        source: EventSource.DISCORD,
        discordUserId,
        citizenId: citizenIdByDiscordId.get(discordUserId) ?? null,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * The citizen of a Discord user can come after the RSVP. Thus look for the
   * citizens of all rows without a citizen again on each run, also of the
   * cancelled rows, so that each row gets its citizen when one exists.
   */
  const unresolvedParticipants = await prisma.eventParticipant.findMany({
    where: {
      eventId: databaseEvent.id,
      source: EventSource.DISCORD,
      citizenId: null,
    },
    select: {
      discordUserId: true,
    },
    distinct: ["discordUserId"],
  });
  if (unresolvedParticipants.length > 0) {
    const citizens = await prisma.citizen.findMany({
      where: {
        discordId: {
          in: unresolvedParticipants.map(
            (participant) => participant.discordUserId!,
          ),
        },
        ...ACTIVE_CITIZEN_WHERE,
      },
      select: {
        id: true,
        discordId: true,
      },
    });

    if (citizens.length > 0) {
      await prisma.$transaction(
        citizens.map((citizen) =>
          prisma.eventParticipant.updateMany({
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
    }
  }

  /**
   * Leaving an event also drops the citizen's position applications and
   * unassigns them from their lineup positions, so a sync is worth
   * recording even though it only mirrors Discord.
   */
  if (added.length > 0 || removed.length > 0) {
    await createAuditEvents([
      {
        type: AuditEventType.EVENT_PARTICIPANTS_SYNCED,
        data: {
          eventId: databaseEvent.id,
          addedCount: added.length,
          removedCount: removed.length,
        },
      },
    ]);
  }
};
