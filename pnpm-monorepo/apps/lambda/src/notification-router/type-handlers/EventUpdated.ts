import {
  findEventParticipantRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventUpdatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  actorCitizenId?: Citizen["id"] | null;
};

export const EventUpdatedHandler = async (
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
  };
  const text = getEventUpdatedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_updated" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
