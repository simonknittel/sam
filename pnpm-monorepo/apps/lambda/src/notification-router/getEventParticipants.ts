import { prisma, type Event } from "@sam-monorepo/database";
import { getNotifiableCitizens } from "./getNotifiableCitizens.js";

export const getEventParticipants = async (eventId: Event["id"]) => {
  /**
   * Calculate recipients
   */
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      name: true,
      participants: {
        where: { cancelledAt: null },
        select: {
          discordUserId: true,
        },
      },
    },
  });
  if (!event || event.participants.length <= 0) return;

  const participants = await getNotifiableCitizens({
    discordId: {
      in: event.participants
        .map((participant) => participant.discordUserId)
        .filter(
          (discordUserId): discordUserId is string => discordUserId !== null,
        ),
    },
  });
  if (!participants || participants.length <= 0) return;

  return { event, participants };
};
