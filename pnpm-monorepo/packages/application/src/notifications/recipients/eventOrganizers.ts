import type { Prisma } from "@sam-monorepo/database/client";
import type { PermissionSet } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
  type EventRecipientOptions,
} from "./eventRecipients.js";
import type { Recipient } from "./recipient.js";

/** The fields of an event that `findEventOrganizers()` reads */
export const EVENT_ORGANIZER_SELECT = {
  ...EVENT_RECIPIENT_SELECT,
  discordCreatorId: true,
} as const satisfies Prisma.EventSelect;

type EventOrganizerInput = Prisma.EventGetPayload<{
  select: typeof EVENT_ORGANIZER_SELECT;
}>;

/**
 * The organizers of the event who can see it now (see
 * `findEventRecipients()`), without the excluded citizen. The organizers are
 * the creator, the managers and the citizen of the Discord creator, like in
 * `isEventOrganizer()`. The holders of `event;manage` and
 * `othersEventPosition;manage` are not organizers: they are too many.
 */
export const findEventOrganizers = (
  context: ApplicationContext,
  event: EventOrganizerInput,
  options: EventRecipientOptions,
): Promise<Recipient[]> => {
  const organizerIds = event.managers.map((manager) => manager.id);
  if (event.createdById !== null) organizerIds.push(event.createdById);

  return findEventRecipients(
    context,
    event,
    {
      OR: [
        { id: { in: organizerIds } },
        ...(event.discordCreatorId === null
          ? []
          : [{ discordId: event.discordCreatorId }]),
      ],
    },
    options,
  );
};

export interface FindEventOrganizerRecipientsInput {
  readonly eventId: string;
  /** The citizen who changed the own participation */
  readonly citizenId: string;
}

export interface EventOrganizerRecipients extends EventNotificationRecipients {
  /** The citizen whom the notification is about */
  readonly citizen: { readonly handle: string | null };
}

/**
 * The organizers who hear about a change of the participation of a citizen
 * (see `findEventOrganizers()`), without this citizen. Null when the event
 * does not exist.
 */
export const findEventOrganizerRecipients = async (
  context: ApplicationContext,
  input: FindEventOrganizerRecipientsInput,
  /** See `EventRecipientOptions` */
  additionalPermissionSets: readonly PermissionSet[] = [],
): Promise<EventOrganizerRecipients | null> => {
  const [event, citizen] = await Promise.all([
    context.prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, name: true, ...EVENT_ORGANIZER_SELECT },
    }),
    context.prisma.citizen.findUnique({
      where: { id: input.citizenId },
      select: { handle: true },
    }),
  ]);
  if (!event) return null;

  return {
    event: { id: event.id, name: event.name },
    citizen: { handle: citizen?.handle ?? null },
    recipients: await findEventOrganizers(context, event, {
      excludedCitizenId: input.citizenId,
      additionalPermissionSets,
    }),
  };
};
