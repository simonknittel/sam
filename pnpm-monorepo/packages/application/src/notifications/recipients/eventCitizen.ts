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
 * The citizen whom the notification is about (for example a citizen whom a
 * manager added to the event, removed from it or made a manager of it), when
 * the citizen can see the event now (see `findEventRecipients()`). The roles
 * of the citizen and the visibility of the event can change after the
 * request. Null when the event does not exist.
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
