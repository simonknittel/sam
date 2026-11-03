import {
  findEventCitizenRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventParticipationAddedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
};

export const EventParticipationAddedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventCitizenRecipient(context, {
    eventId: payload.eventId,
    citizenId: payload.citizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
  };
  const text = getEventParticipationAddedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_participation_added" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
