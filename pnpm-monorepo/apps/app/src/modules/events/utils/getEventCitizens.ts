import { prisma } from "@/db";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getEventCitizens = cache(async (eventId: Event["id"]) => {
  const databaseParticipants = await prisma.eventParticipant.findMany({
    where: {
      eventId,
      cancelledAt: null,
    },
  });

  const citizens = await prisma.entity.findMany({
    where: {
      discordId: {
        in: databaseParticipants
          .map((participant) => participant.discordUserId)
          .filter(
            (discordUserId): discordUserId is string => discordUserId !== null,
          ),
      },
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
