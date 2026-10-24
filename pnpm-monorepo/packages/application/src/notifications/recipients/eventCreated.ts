import type { ApplicationContext } from "../../context.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";

export interface FindEventCreatedRecipientsInput {
  readonly eventId: string;
}

/**
 * The citizens who can see the new event (see `findEventRecipients()`). Null
 * when the event does not exist.
 */
export const findEventCreatedRecipients = async (
  context: ApplicationContext,
  input: FindEventCreatedRecipientsInput,
): Promise<EventNotificationRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: {
      id: input.eventId,
    },
    select: {
      id: true,
      name: true,
      ...EVENT_RECIPIENT_SELECT,
    },
  });
  if (!event) return null;

  return {
    event: { id: event.id, name: event.name },
    recipients: await findEventRecipients(context, event, {}),
  };
};
