import {
  findEventCitizenRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import {
  getEventApplicationAnsweredText,
  type EventApplicationAnswer,
} from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
  answer: EventApplicationAnswer;
  reason: string | null;
};

/** A manager approved or declined the application of the citizen */
export const EventApplicationAnsweredHandler = async (
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
    answer: payload.answer,
    reason: payload.reason,
  };
  const text = getEventApplicationAnsweredText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_application_answered" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
