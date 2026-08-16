import { prisma } from "@/db";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * The event's active participants as citizens with their ships. Citizens
 * are resolved via the participation row's citizen id (app sign-ups) or
 * Discord id (Discord RSVPs); ships attach through the citizen's Discord
 * account, the only link between citizens and users.
 */
export const getEventCitizens = cache(async (eventId: Event["id"]) => {
  const databaseParticipants = await prisma.eventParticipant.findMany({
    where: {
      eventId,
      cancelledAt: null,
    },
  });

  const citizenIds = new Set<string>();
  const discordUserIds = new Set<string>();
  for (const participant of databaseParticipants) {
    if (participant.citizenId) {
      citizenIds.add(participant.citizenId);
    } else if (participant.discordUserId) {
      discordUserIds.add(participant.discordUserId);
    }
  }

  const citizens = await prisma.entity.findMany({
    where: {
      OR: [
        { id: { in: Array.from(citizenIds) } },
        { discordId: { in: Array.from(discordUserIds) } },
      ],
    },
  });

  const ships = await prisma.ship.findMany({
    where: {
      deletedAt: null,
      owner: {
        accounts: {
          some: {
            providerAccountId: {
              in: citizens
                .filter((citizen) => citizen.discordId)
                .map((citizen) => citizen.discordId!),
            },
          },
        },
      },
    },
    include: {
      owner: {
        include: {
          accounts: true,
        },
      },
    },
  });

  const citizensWithShips = citizens.map((citizen) => ({
    citizen,
    ships: ships.filter((ship) =>
      ship.owner.accounts.some(
        (account) => account.providerAccountId === citizen.discordId,
      ),
    ),
  }));

  return citizensWithShips;
});
