import type { PermissionSet } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";

export interface FindEventParticipantRecipientsInput {
  readonly eventId: string;
  readonly excludedCitizenId?: string | null;
}

export interface EventParticipantRecipients extends EventNotificationRecipients {
  readonly event: EventNotificationRecipients["event"] & {
    readonly startTime: Date;
  };
}

const findParticipantRecipients = async (
  context: ApplicationContext,
  input: FindEventParticipantRecipientsInput,
  {
    ignoresDeletion,
    additionalPermissionSets,
  }: {
    readonly ignoresDeletion: boolean;
    readonly additionalPermissionSets: readonly PermissionSet[];
  },
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
    { excludedCitizenId: input.excludedCitizenId, additionalPermissionSets },
  );

  return {
    event: { id: event.id, name: event.name, startTime: event.startTime },
    recipients,
  };
};

export const findEventParticipantRecipients = (
  context: ApplicationContext,
  input: FindEventParticipantRecipientsInput,
  additionalPermissionSets: readonly PermissionSet[] = [],
): Promise<EventParticipantRecipients | null> =>
  findParticipantRecipients(context, input, {
    ignoresDeletion: false,
    additionalPermissionSets,
  });

export const findEventDeletedRecipients = (
  context: ApplicationContext,
  input: FindEventParticipantRecipientsInput,
): Promise<EventParticipantRecipients | null> =>
  findParticipantRecipients(context, input, {
    ignoresDeletion: true,
    additionalPermissionSets: [],
  });
