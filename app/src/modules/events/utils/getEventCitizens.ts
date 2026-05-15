import { prisma } from "@/db";
import type { Event } from "@/generated/prisma/client";
import { cache } from "react";

export const getEventCitizens = cache(async (eventId: Event["id"]) => {
  const databaseParticipants = await prisma.eventDiscordParticipant.findMany({
    where: {
      event: {
        id: eventId,
      },
    },
  });

  const citizens = await prisma.entity.findMany({
    where: {
      discordId: {
        in: databaseParticipants.map(
          (participant) => participant.discordUserId,
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
