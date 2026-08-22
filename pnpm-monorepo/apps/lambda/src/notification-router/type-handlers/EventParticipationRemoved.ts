import { prisma, type Entity, type Event } from "@sam-monorepo/database";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Entity["id"];
  reason: string | null;
};

/**
 * Removal leaves the citizen's view of the event untouched, so the message
 * still links to the event page.
 */
export const EventParticipationRemovedHandler = async (payload: Payload) => {
  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
    select: { id: true, name: true },
  });
  if (!event) return;

  const body = `Du wurdest vom Event "${event.name}" entfernt.`;

  await publishNotifications([
    {
      receiverId: payload.citizenId,
      notificationType: "event_participation_removed" as const,
      payload: {
        eventId: event.id,
        eventName: event.name,
        reason: payload.reason,
      },
      title: "Vom Event entfernt",
      body: payload.reason ? `${body} Grund: ${payload.reason}` : body,
      url: `/app/events/${event.id}`,
    },
  ]);
};
