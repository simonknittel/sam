import type { ApplicationContext } from "../../context.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";

export interface FindEventCitizenRecipientInput {
  readonly eventId: string;
  readonly citizenId: string;
}

/**
 * The roles of the citizen and the visibility of the event can change after the
 * request
 */
export const findEventCitizenRecipient = async (
  context: ApplicationContext,
  input: FindEventCitizenRecipientInput,
): Promise<EventNotificationRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, name: true, ...EVENT_RECIPIENT_SELECT },
  });
  if (!event) return null;

  return {
    event: { id: event.id, name: event.name },
    recipients: await findEventRecipients(context, event, {
      id: input.citizenId,
    }),
  };
};
