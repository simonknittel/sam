import {
  findEventOrganizerRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventPositionVacatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
  positionNames: string[];
};

/** A participant cancelled and gave free the own positions */
export const EventPositionVacatedHandler = async (
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
    positionNames: payload.positionNames,
  };
  const text = getEventPositionVacatedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_position_vacated" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/lineup`,
    })),
  );
};
