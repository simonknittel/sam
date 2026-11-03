import {
  findEventCitizenRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventParticipationRemovedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
  reason: string | null;
};

/**
 * The message links to the event page, thus only a citizen who can see the
 * event now gets it (see `findEventCitizenRecipient()`)
 */
export const EventParticipationRemovedHandler = async (
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
    reason: payload.reason,
  };
  const text = getEventParticipationRemovedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_participation_removed" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
