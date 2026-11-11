import {
  findEventInvitationRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { getEventInvitationCreatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  invitationId: string;
};

/**
 * The message links to the event page, where the citizen answers the
 * invitation. The on-site notification carries the invitation, thus the
 * notification center asks for its state and shows the buttons while it is
 * open.
 */
export const EventInvitationCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventInvitationRecipient(context, {
    invitationId: payload.invitationId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
    invitationId: result.invitation.id,
    invitedByHandle: result.invitation.invitedByHandle,
    message: result.invitation.message,
  };
  const text = getEventInvitationCreatedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_invitation_created" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
