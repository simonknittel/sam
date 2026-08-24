import { prisma } from "@/db";
import type { EventParticipantRow } from "@/modules/events/queries/eventRelationSelects";
import { SHIP_VARIANT_SELECT } from "@/modules/fleet/queries/shipQuery";
import { VariantStatus, type Event } from "@sam-monorepo/database/client";
import { cache } from "react";
import { collectParticipantOwners } from "./collectParticipantOwners";

export const getEventFleet = cache(
  async (
    event: Event & {
      participants: EventParticipantRow[];
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
      select: {
        variant: {
          select: SHIP_VARIANT_SELECT,
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
