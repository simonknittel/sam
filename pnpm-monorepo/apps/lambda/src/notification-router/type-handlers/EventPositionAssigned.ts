import {
  findEventPositionAssignedRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type EventPosition } from "@sam-monorepo/database";
import { getEventPositionAssignedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

interface Payload {
  positionId: EventPosition["id"];
  citizenId: Citizen["id"];
}

export const EventPositionAssignedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventPositionAssignedRecipient(context, {
    positionId: payload.positionId,
    citizenId: payload.citizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
    positionName: result.positionName,
  };
  const text = getEventPositionAssignedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_position_assigned" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/lineup`,
    })),
  );
};
