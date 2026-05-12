import { type Event } from "@sam-monorepo/database";
import { getEventParticipants } from "../getEventParticipants.js";
import { publishWebPushNotifications } from "../web-push.js";

type Payload = {
  eventId: Event["id"];
};

export const EventUpdatedHandler = async (payload: Payload) => {
  const result = await getEventParticipants(payload.eventId);
  if (!result) return;

  await publishWebPushNotifications(
    result.participants.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_updated",
      title: "Event aktualisiert",
      body: result.event.name,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
