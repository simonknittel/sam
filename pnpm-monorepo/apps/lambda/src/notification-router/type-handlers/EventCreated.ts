import { prisma, type Event } from "@sam-monorepo/database";
import { getEventRecipientWhere } from "../getEventRecipientWhere.js";
import { getNotifiableCitizens } from "../getNotifiableCitizens.js";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
};

export const EventCreatedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients
   */
  const event = await prisma.event.findUnique({
    where: {
      id: payload.eventId,
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (!event) return;

  const recipientWhere = await getEventRecipientWhere(event.id);
  if (!recipientWhere) return;

  const citizens = await getNotifiableCitizens(recipientWhere);
  if (citizens.length <= 0) return;

  /**
   * Publish notifications
   */
  await publishNotifications(
    citizens.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_created" as const,
      payload: { eventId: event.id, eventName: event.name },
      title: "Neues Event",
      body: event.name,
      url: `/app/events/${event.id}`,
    })),
  );
};
