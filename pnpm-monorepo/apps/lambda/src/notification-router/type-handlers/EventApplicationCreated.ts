import {
  findEventApplicationRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { getEventApplicationCreatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  applicationId: string;
};

export const EventApplicationCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventApplicationRecipients(context, {
    applicationId: payload.applicationId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
    citizenHandle: result.citizen.handle,
    comment: result.application.comment,
  };
  const text = getEventApplicationCreatedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_application_created" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/participants`,
    })),
  );
};
