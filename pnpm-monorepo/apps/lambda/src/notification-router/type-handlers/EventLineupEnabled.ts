import { type Event } from "@sam-monorepo/database";
import { publishWebPushNotifications } from "../web-push.js";
import { getEventParticipants } from "../getEventParticipants.js";

type Payload = {
  eventId: Event["id"];
};

export const EventLineupEnabledHandler = async (payload: Payload) => {
  const result = await getEventParticipants(payload.eventId);
  if (!result) return;

  await publishWebPushNotifications(
    result.participants.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_lineup_enabled",
      title: "Aufstellung veröffentlicht",
      body: result.event.name,
      url: `/app/events/${result.event.id}/lineup`,
    })),
  );
};
