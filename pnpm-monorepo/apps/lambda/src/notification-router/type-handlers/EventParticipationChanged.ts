import {
  findEventOrganizerRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import {
  getEventParticipationChangedText,
  type EventParticipationChange,
} from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
  change: EventParticipationChange;
};

/** A participant signed up or cancelled shortly before the start */
export const EventParticipationChangedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventOrganizerRecipients(context, {
    eventId: payload.eventId,
    citizenId: payload.citizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
    citizenHandle: result.citizen.handle,
    change: payload.change,
  };
  const text = getEventParticipationChangedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_participation_changed" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/participants`,
    })),
  );
};
