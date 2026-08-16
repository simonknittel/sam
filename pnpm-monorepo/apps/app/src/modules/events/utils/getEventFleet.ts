import { prisma } from "@/db";
import {
  VariantStatus,
  type Event,
  type EventParticipant,
} from "@sam-monorepo/database/client";
import { cache } from "react";

export const getEventFleet = cache(
  async (
    event: Event & {
      participants: EventParticipant[];
    },
  ) => {
    const discordUserIds = event.participants
      .map((participant) => participant.discordUserId)
      .filter(
        (discordUserId): discordUserId is string => discordUserId !== null,
      );

    const ships = await prisma.ship.findMany({
      where: {
        deletedAt: null,
        owner: {
          accounts: {
            some: {
              providerAccountId: {
                in: discordUserIds,
              },
            },
          },
        },
        variant: {
          status: VariantStatus.FLIGHT_READY,
        },
      },
      include: {
        variant: {
          include: {
            series: {
              include: {
                manufacturer: {
                  include: {
                    image: true,
                  },
                },
              },
            },
            tags: true,
          },
        },
      },
    });

    const groupedShips = Map.groupBy(ships, (ship) => ship.variant.id);

    const countedShips = Array.from(groupedShips.values(), (ships) => {
      const ship = ships[0];

      return {
        variant: ship.variant,
        count: ships.length,
      };
    });

    return countedShips;
  },
);
