import {
  findEventCreatedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventCreatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  actorCitizenId?: Citizen["id"] | null;
};

export const EventCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventCreatedRecipients(context, {
    eventId: payload.eventId,
    excludedCitizenId: payload.actorCitizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
  };
  const text = getEventCreatedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_created" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
