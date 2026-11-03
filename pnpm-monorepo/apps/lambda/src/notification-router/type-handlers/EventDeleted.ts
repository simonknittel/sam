import {
  findEventDeletedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventDeletedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  actorCitizenId?: Citizen["id"] | null;
};

export const EventDeletedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventDeletedRecipients(context, {
    eventId: payload.eventId,
    excludedCitizenId: payload.actorCitizenId,
  });
  if (!result) return;

  const notificationPayload = { eventName: result.event.name };
  const text = getEventDeletedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_deleted" as const,
      payload: notificationPayload,
      ...text,
    })),
  );
};
