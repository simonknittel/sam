import { prisma } from "@/db";
import type { EventParticipantRow } from "@/modules/events/queries/eventRelationSelects";
import { SHIP_VARIANT_SELECT } from "@/modules/fleet/queries/shipQuery";
import { VariantStatus, type Event } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { cache } from "react";
import { buildParticipantCitizenWhere } from "./participantCitizenWhere";

export const getEventFleet = cache(
  async (
    event: Event & {
      participants: EventParticipantRow[];
    },
  ) => {
    const ships = await prisma.ship.findMany({
      where: {
        deletedAt: null,
        /** A fleet count is a statistic, thus deleted citizens do not count */
        owner: {
          AND: [
            buildParticipantCitizenWhere(event.participants),
            ACTIVE_CITIZEN_WHERE,
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
