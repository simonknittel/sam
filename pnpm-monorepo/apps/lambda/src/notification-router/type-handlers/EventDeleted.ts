import { type Event } from "@sam-monorepo/database";
import { getEventParticipants } from "../getEventParticipants.js";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
};

export const EventDeletedHandler = async (payload: Payload) => {
  const result = await getEventParticipants(payload.eventId);
  if (!result) return;

  await publishNotifications(
    result.participants.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_deleted" as const,
      payload: { eventName: result.event.name },
      title: "Event gelöscht",
      body: result.event.name,
    })),
  );
};
