import { prisma } from "@/db";
import {
  VariantStatus,
  type Event,
  type EventParticipant,
} from "@sam-monorepo/database/client";
import { cache } from "react";
import { collectParticipantOwners } from "./collectParticipantOwners";

export const getEventFleet = cache(
  async (
    event: Event & {
      participants: EventParticipant[];
    },
  ) => {
    const { citizenIds, discordUserIds } = collectParticipantOwners(
      event.participants,
    );

    const ships = await prisma.ship.findMany({
      where: {
        deletedAt: null,
        owner: {
          OR: [
            { id: { in: citizenIds } },
            { discordId: { in: discordUserIds } },
          ],
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
