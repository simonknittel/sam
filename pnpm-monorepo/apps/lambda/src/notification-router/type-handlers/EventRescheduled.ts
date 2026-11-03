import {
  findEventParticipantRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventRescheduledText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  actorCitizenId: Citizen["id"] | null;
};

/**
 * The start of the event moved. The text shows the start at the delivery,
 * thus a second move before the delivery shows the newest start.
 */
export const EventRescheduledHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventParticipantRecipients(context, {
    eventId: payload.eventId,
    excludedCitizenId: payload.actorCitizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
    startTime: result.event.startTime.toISOString(),
  };
  const text = getEventRescheduledText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_rescheduled" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
