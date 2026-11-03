import {
  findEventPositionApplicationRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type EventPositionApplication } from "@sam-monorepo/database";
import { getEventPositionApplicationCreatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  applicationId: EventPositionApplication["id"];
};

export const EventPositionApplicationCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventPositionApplicationRecipients(context, {
    applicationId: payload.applicationId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
    positionName: result.position.name,
    citizenHandle: result.citizen.handle,
  };
  const text = getEventPositionApplicationCreatedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_position_application_created" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/lineup`,
    })),
  );
};
