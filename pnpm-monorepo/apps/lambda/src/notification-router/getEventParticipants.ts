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
      discordParticipants: {
        select: {
          discordUserId: true,
        },
      },
    },
  });
  if (!event || event.discordParticipants.length <= 0) return;

  const participants = await getNotifiableCitizens({
    discordId: {
      in: event.discordParticipants.map(
        (participant) => participant.discordUserId,
      ),
    },
  });
  if (!participants || participants.length <= 0) return;

  return { event, participants };
};
