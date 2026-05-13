import { prisma } from "@/db";
import {
  VariantStatus,
  type Event,
  type EventDiscordParticipant,
} from "@/generated/prisma/client";
import { groupBy } from "lodash";
import { cache } from "react";

export const getEventFleet = cache(
  async (
    event: Event & {
      discordParticipants: EventDiscordParticipant[];
    },
  ) => {
    const discordUserIds = event.discordParticipants.map(
      (user) => user.discordUserId,
    );

    const ships = await prisma.ship.findMany({
      where: {
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

    const groupedShips = groupBy(ships, (ship) => ship.variant.id);

    const countedShips = Object.values(groupedShips).map((ships) => {
      const ship = ships[0];

      return {
        variant: ship.variant,
        count: ships.length,
      };
    });

    return countedShips;
  },
);
