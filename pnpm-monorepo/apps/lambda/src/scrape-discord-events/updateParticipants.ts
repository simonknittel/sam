import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import type { z } from "zod";
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
  });

  const { added, removed } = diffParticipants(
    discordEventUserIds,
    activeParticipants,
  );

  /**
   * A withdrawal soft-cancels the participation row (the active-key mirrors
   * are nulled in the same update so the "one active row per person" unique
   * constraints release the slot) and, like before the unification, drops
   * the citizen's position applications and unassigns their lineup
   * positions — all in one transaction.
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
          activeCitizenId: null,
          activeDiscordUserId: null,
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
   * time where possible.
   */
  if (added.length > 0) {
    const citizens = await prisma.entity.findMany({
      where: {
        discordId: {
          in: added,
        },
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
        activeDiscordUserId: discordUserId,
        activeCitizenId: citizenIdByDiscordId.get(discordUserId) ?? null,
      })),
    });
  }

  /**
   * Participants who joined before their citizen existed in the database:
   * re-resolve still-active rows without a citizen on every run so they
   * eventually attach once the citizen is created.
   */
  const unresolvedParticipants = activeParticipants.filter(
    (participant) =>
      participant.citizenId === null &&
      participant.discordUserId !== null &&
      !removed.includes(participant.discordUserId),
  );
  if (unresolvedParticipants.length > 0) {
    const citizens = await prisma.entity.findMany({
      where: {
        discordId: {
          in: unresolvedParticipants.map(
            (participant) => participant.discordUserId!,
          ),
        },
      },
      select: {
        id: true,
        discordId: true,
      },
    });
    const citizenIdByDiscordId = new Map(
      citizens.map((citizen) => [citizen.discordId, citizen.id]),
    );

    const resolvableParticipants = unresolvedParticipants.filter(
      (participant) => citizenIdByDiscordId.has(participant.discordUserId),
    );
    if (resolvableParticipants.length > 0) {
      await prisma.$transaction(
        resolvableParticipants.map((participant) =>
          prisma.eventParticipant.update({
            where: {
              id: participant.id,
            },
            data: {
              citizenId: citizenIdByDiscordId.get(participant.discordUserId),
              activeCitizenId: citizenIdByDiscordId.get(
                participant.discordUserId,
              ),
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
