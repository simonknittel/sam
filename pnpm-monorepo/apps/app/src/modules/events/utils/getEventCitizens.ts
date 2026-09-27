import { prisma } from "@/db";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";
import { buildRequiredVariantShipWhere } from "../queries/eventRelationSelects";
import { collectParticipantOwners } from "./collectParticipantOwners";

/**
 * The event's active participants as citizens with their ships of the
 * required variants.
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

  const citizens = await prisma.citizen.findMany({
    where: {
      OR: [{ id: { in: citizenIds } }, { discordId: { in: discordUserIds } }],
    },
    select: {
      id: true,
      handle: true,
      deletedAt: true,
      ships: {
        where: buildRequiredVariantShipWhere(eventId),
        select: {
          variantId: true,
        },
      },
    },
  });

  return citizens.map(({ ships, ...citizen }) => ({ citizen, ships }));
});
