import {
  findEventOrganizerRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import {
  getEventInvitationAnsweredText,
  type EventInvitationAnswer,
} from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
  answer: EventInvitationAnswer;
  comment: string | null;
};

/** An invited citizen accepted or declined the invitation */
export const EventInvitationAnsweredHandler = async (
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
    answer: payload.answer,
    comment: payload.comment,
  };
  const text = getEventInvitationAnsweredText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_invitation_answered" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/participants`,
    })),
  );
};
