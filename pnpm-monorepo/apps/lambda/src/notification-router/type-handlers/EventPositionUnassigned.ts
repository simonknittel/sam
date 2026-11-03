import {
  findEventPositionUnassignedRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventPositionUnassignedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

interface Payload {
  eventId: Event["id"];
  citizenId: Citizen["id"];
  positionName: string;
}

export const EventPositionUnassignedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventPositionUnassignedRecipient(context, {
    eventId: payload.eventId,
    citizenId: payload.citizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
    positionName: payload.positionName,
  };
  const text = getEventPositionUnassignedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_position_unassigned" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/lineup`,
    })),
  );
};
