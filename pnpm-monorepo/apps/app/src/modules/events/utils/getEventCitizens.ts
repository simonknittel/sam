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
  });

  const { citizenIds, discordUserIds } =
    collectParticipantOwners(databaseParticipants);

  const citizens = await prisma.entity.findMany({
    where: {
      OR: [{ id: { in: citizenIds } }, { discordId: { in: discordUserIds } }],
    },
    include: {
      ships: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  return citizens.map(({ ships, ...citizen }) => ({ citizen, ships }));
});
