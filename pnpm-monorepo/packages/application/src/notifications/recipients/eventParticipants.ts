import type { ApplicationContext } from "../../context.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";

export interface FindEventParticipantRecipientsInput {
  readonly eventId: string;
}

export interface EventParticipantRecipients extends EventNotificationRecipients {
  readonly event: EventNotificationRecipients["event"] & {
    readonly startTime: Date;
  };
}

const findParticipantRecipients = async (
  context: ApplicationContext,
  input: FindEventParticipantRecipientsInput,
  { ignoresDeletion }: { readonly ignoresDeletion: boolean },
): Promise<EventParticipantRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: {
      id: input.eventId,
    },
    select: {
      id: true,
      name: true,
      startTime: true,
      ...EVENT_RECIPIENT_SELECT,
      participants: {
        where: { cancelledAt: null },
        select: {
          discordUserId: true,
          citizenId: true,
        },
      },
    },
  });
  if (!event || event.participants.length <= 0) return null;

  const discordUserIds = event.participants
    .map((participant) => participant.discordUserId)
    .filter((discordUserId): discordUserId is string => discordUserId !== null);
  const citizenIds = event.participants
    .map((participant) => participant.citizenId)
    .filter((citizenId): citizenId is string => citizenId !== null);

  const recipients = await findEventRecipients(
    context,
    ignoresDeletion ? { ...event, deletedAt: null } : event,
    {
      OR: [{ discordId: { in: discordUserIds } }, { id: { in: citizenIds } }],
    },
  );

  return {
    event: { id: event.id, name: event.name, startTime: event.startTime },
    recipients,
  };
};

/**
 * The active participants of the event (app sign-ups by citizen id, Discord
 * RSVPs by Discord id) who can see the event now (see
 * `findEventRecipients()`). Thus a deleted event has no recipients. Null when
 * the event does not exist or has no active participant.
 */
export const findEventParticipantRecipients = (
  context: ApplicationContext,
  input: FindEventParticipantRecipientsInput,
): Promise<EventParticipantRecipients | null> =>
  findParticipantRecipients(context, input, { ignoresDeletion: false });

/**
 * The active participants of the deleted event who could see the event
 * before the deletion. Null when the event does not exist or has no active
 * participant.
 */
export const findEventDeletedRecipients = (
  context: ApplicationContext,
  input: FindEventParticipantRecipientsInput,
): Promise<EventParticipantRecipients | null> =>
  findParticipantRecipients(context, input, { ignoresDeletion: true });
