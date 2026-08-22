import { prisma, type Entity, type Event } from "@sam-monorepo/database";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Entity["id"];
};

/**
 * The app only lets a manager add citizens who can see the event, so the
 * single receiver needs no further reachability check here.
 */
export const EventParticipationAddedHandler = async (payload: Payload) => {
  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
    select: { id: true, name: true },
  });
  if (!event) return;

  await publishNotifications([
    {
      receiverId: payload.citizenId,
      notificationType: "event_participation_added" as const,
      payload: { eventId: event.id, eventName: event.name },
      title: "Zum Event hinzugefügt",
      body: `Du wurdest zum Event "${event.name}" hinzugefügt.`,
      url: `/app/events/${event.id}`,
    },
  ]);
};
