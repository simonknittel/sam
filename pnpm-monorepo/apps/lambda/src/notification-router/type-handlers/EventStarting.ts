import { type Event } from "@sam-monorepo/database";
import { getEventParticipants } from "../getEventParticipants.js";
import { publishWebPushNotifications } from "../web-push.js";

type Payload = {
  eventId: Event["id"];
};

export const EventStartingHandler = async (payload: Payload) => {
  const result = await getEventParticipants(payload.eventId);
  if (!result) return;

  await publishWebPushNotifications(
    result.participants.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_starting",
      title: "Event beginnt in 15 Minuten",
      body: result.event.name,
      url: `/app/events/${result.event.id}`,
    })),
    {
      TTL: 15 * 60, // 15 minutes in seconds
      urgency: "high",
    },
  );
};
