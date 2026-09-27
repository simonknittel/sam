import { prisma } from "@/db";
import type { Event } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { cache } from "react";
import { buildRequiredVariantShipWhere } from "../queries/eventRelationSelects";
import { buildParticipantCitizenWhere } from "./participantCitizenWhere";

/**
 * The event's active participants as citizens with their ships of the
 * required variants. The lineup offers these citizens for its positions,
 * thus a deleted citizen is not one of them.
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

  const citizens = await prisma.citizen.findMany({
    where: {
      ...buildParticipantCitizenWhere(databaseParticipants),
      ...ACTIVE_CITIZEN_WHERE,
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
