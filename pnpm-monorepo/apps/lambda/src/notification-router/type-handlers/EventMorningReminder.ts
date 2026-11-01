import {
  findEventParticipantRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Event } from "@sam-monorepo/database";
import { getEventMorningReminderTitle } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
};

const MILLISECONDS_PER_SECOND = 1000;

export const EventMorningReminderHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventParticipantRecipients(context, {
    eventId: payload.eventId,
  });
  if (!result) return;

  const title = getEventMorningReminderTitle(result.event.startTime);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_morning_reminder" as const,
      payload: {
        eventId: result.event.id,
        eventName: result.event.name,
        startTime: result.event.startTime.toISOString(),
      },
      title,
      body: result.event.name,
      url: `/app/events/${result.event.id}`,
    })),
    {
      // A reminder that arrives after the start of the event has no use
      TTL: Math.max(
        0,
        Math.floor(
          (result.event.startTime.getTime() - context.now().getTime()) /
            MILLISECONDS_PER_SECOND,
        ),
      ),
    },
  );
};
