import {
  findEventParticipantRecipients,
  FREQUENT_AUTOMATIONS_INTERVAL_MINUTES,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Event } from "@sam-monorepo/database";
import { publishNotifications } from "../publish.js";

const SECONDS_PER_MINUTE = 60;

type Payload = {
  eventId: Event["id"];
};

export const EventStartingHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventParticipantRecipients(context, {
    eventId: payload.eventId,
  });
  if (!result) return;

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_starting" as const,
      payload: { eventId: result.event.id, eventName: result.event.name },
      title: "Event beginnt in 15 Minuten",
      body: result.event.name,
      url: `/app/events/${result.event.id}`,
    })),
    {
      // The event starts at most one run interval after the job (see
      // `notifyEventsStartingSoon()`)
      TTL: FREQUENT_AUTOMATIONS_INTERVAL_MINUTES * SECONDS_PER_MINUTE,
      urgency: "high",
    },
  );
};
