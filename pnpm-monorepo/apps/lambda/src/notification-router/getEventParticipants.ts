import { prisma, type Event } from "@sam-monorepo/database";
import { getEventRecipientWhere } from "./getEventRecipientWhere.js";
import { getNotifiableCitizens } from "./getNotifiableCitizens.js";

export const getEventParticipants = async (eventId: Event["id"]) => {
  /**
   * Calculate recipients: the event's active participants (app sign-ups by
   * citizen id, Discord RSVPs by Discord id), narrowed to citizens who can
   * see the event.
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
          citizenId: true,
        },
      },
    },
  });
  if (!event || event.participants.length <= 0) return;

  const recipientWhere = await getEventRecipientWhere(event.id);
  if (!recipientWhere) return;

  const discordUserIds = event.participants
    .map((participant) => participant.discordUserId)
    .filter((discordUserId): discordUserId is string => discordUserId !== null);
  const citizenIds = event.participants
    .map((participant) => participant.citizenId)
    .filter((citizenId): citizenId is string => citizenId !== null);

  const participants = await getNotifiableCitizens({
    AND: [
      {
        OR: [{ discordId: { in: discordUserIds } }, { id: { in: citizenIds } }],
      },
      recipientWhere,
    ],
  });
  if (participants.length <= 0) return;

  return { event, participants };
};
