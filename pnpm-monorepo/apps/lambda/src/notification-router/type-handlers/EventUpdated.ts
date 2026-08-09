import { type Event } from "@sam-monorepo/database";
import { getEventParticipants } from "../getEventParticipants.js";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
};

export const EventUpdatedHandler = async (payload: Payload) => {
  const result = await getEventParticipants(payload.eventId);
  if (!result) return;

  await publishNotifications(
    result.participants.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_updated" as const,
      payload: { eventId: result.event.id, eventName: result.event.name },
      title: "Event aktualisiert",
      body: result.event.name,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
