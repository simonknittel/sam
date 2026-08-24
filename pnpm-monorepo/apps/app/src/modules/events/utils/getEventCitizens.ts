import { prisma } from "@/db";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";
import { collectParticipantOwners } from "./collectParticipantOwners";

/**
 * The event's active participants as citizens with their ships.
 */
export const getEventCitizens = cache(async (eventId: Event["id"]) => {
  const databaseParticipants = await prisma.eventParticipant.findMany({
    where: {
      eventId,
      cancelledAt: null,
    },
    select: {
      citizenId: true,
      discordUserId: true,
    },
  });

  const { citizenIds, discordUserIds } =
    collectParticipantOwners(databaseParticipants);

  const citizens = await prisma.entity.findMany({
    where: {
      OR: [{ id: { in: citizenIds } }, { discordId: { in: discordUserIds } }],
    },
    select: {
      id: true,
      handle: true,
      ships: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          variantId: true,
        },
      },
    },
  });

  return citizens.map(({ ships, ...citizen }) => ({ citizen, ships }));
});
