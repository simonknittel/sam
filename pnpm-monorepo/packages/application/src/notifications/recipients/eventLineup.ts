import type { Prisma } from "@sam-monorepo/database/client";
import type { ApplicationContext } from "../../context.js";
import { isLineupPublished } from "../../events/eventManageRules.js";
import { LINEUP_PERMISSION_SETS } from "../../lineup/lineupGuards.js";
import { findEventPositionTree } from "../../lineup/lineupOutput.js";
import {
  findEventOrganizerRecipients,
  type EventOrganizerRecipients,
  type FindEventOrganizerRecipientsInput,
} from "./eventOrganizers.js";
import { findEventParticipantRecipients } from "./eventParticipants.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";
import type { Recipient } from "./recipient.js";

const LINEUP_EVENT_RECIPIENT_SELECT = {
  id: true,
  name: true,
  lineupEnabled: true,
  participationEnabled: true,
  ...EVENT_RECIPIENT_SELECT,
} as const satisfies Prisma.EventSelect;

/** One level of the tree of `findEventPositionTree()` */
interface PositionTreeNode {
  readonly name: string;
  readonly citizen: { readonly id: string } | null;
  /** Missing on the deepest level */
  readonly childPositions?: readonly PositionTreeNode[];
}

/**
 * The positions in the order of the lineup page: each position before its
 * children
 */
const flattenPositionTree = (
  positions: readonly PositionTreeNode[],
): PositionTreeNode[] =>
  positions.flatMap((position) => [
    position,
    ...flattenPositionTree(position.childPositions ?? []),
  ]);

export interface EventLineupRecipient extends Recipient {
  /**
   * The positions of the recipient in the order of the lineup page. Empty
   * when the recipient holds no position.
   */
  readonly positionNames: string[];
}

export interface EventLineupEnabledRecipients {
  readonly event: EventNotificationRecipients["event"];
  readonly recipients: EventLineupRecipient[];
}

/**
 * The participants of the event who can see its lineup now (see
 * `findEventParticipantRecipients()` and `LINEUP_PERMISSION_SETS`), without
 * the excluded citizen, each with the own positions. Null when the event
 * does not exist, has no active participant, or when the participants do
 * not see the lineup anymore (see `isLineupPublished()`).
 */
export const findEventLineupEnabledRecipients = async (
  context: ApplicationContext,
  input: {
    readonly eventId: string;
    /** The citizen who caused the notification gets none */
    readonly excludedCitizenId?: string | null;
  },
): Promise<EventLineupEnabledRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: { id: input.eventId },
    select: { lineupEnabled: true, participationEnabled: true },
  });
  if (!event || !isLineupPublished(event)) return null;

  const result = await findEventParticipantRecipients(
    context,
    input,
    LINEUP_PERMISSION_SETS,
  );
  if (!result) return null;

  const assignedPositions = flattenPositionTree(
    await findEventPositionTree(context, input.eventId),
  ).flatMap(({ name, citizen }) =>
    citizen ? [{ citizenId: citizen.id, name }] : [],
  );
  const positionsByCitizenId = Map.groupBy(
    assignedPositions,
    (position) => position.citizenId,
  );

  return {
    event: { id: result.event.id, name: result.event.name },
    recipients: result.recipients.map((recipient) => ({
      ...recipient,
      positionNames: (positionsByCitizenId.get(recipient.citizenId) ?? []).map(
        (position) => position.name,
      ),
    })),
  };
};

export interface EventPositionRecipients extends EventNotificationRecipients {
  readonly positionName: string;
}

/**
 * The citizen of a new assignment, when the citizen still holds the position,
 * the participants see the lineup (see `isLineupPublished()`) and the citizen
 * can see the lineup now (see `findEventRecipients()` and
 * `LINEUP_PERMISSION_SETS`). Null when the position does not exist anymore,
 * a later change gave it to a different citizen (that change notifies on its
 * own), or when the participants do not see the lineup.
 */
export const findEventPositionAssignedRecipient = async (
  context: ApplicationContext,
  input: { readonly positionId: string; readonly citizenId: string },
): Promise<EventPositionRecipients | null> => {
  const position = await context.prisma.eventPosition.findUnique({
    where: { id: input.positionId },
    select: {
      name: true,
      citizenId: true,
      event: { select: LINEUP_EVENT_RECIPIENT_SELECT },
    },
  });
  if (
    !position?.event ||
    position.citizenId !== input.citizenId ||
    !isLineupPublished(position.event)
  )
    return null;

  return {
    event: { id: position.event.id, name: position.event.name },
    positionName: position.name,
    recipients: await findEventRecipients(
      context,
      position.event,
      { id: input.citizenId },
      { additionalPermissionSets: LINEUP_PERMISSION_SETS },
    ),
  };
};

/**
 * The citizen who lost a position, when the participants see the lineup
 * (see `isLineupPublished()`) and the citizen can see the lineup now (see
 * `findEventRecipients()` and `LINEUP_PERMISSION_SETS`). Null when the event
 * does not exist, when the participants do not see the lineup, or when the
 * citizen holds the position again: then the loss is not true anymore.
 */
export const findEventPositionUnassignedRecipient = async (
  context: ApplicationContext,
  input: {
    readonly eventId: string;
    readonly citizenId: string;
    /** Null when the change deleted the position */
    readonly positionId: string | null;
  },
): Promise<EventNotificationRecipients | null> => {
  const [event, position] = await Promise.all([
    context.prisma.event.findUnique({
      where: { id: input.eventId },
      select: LINEUP_EVENT_RECIPIENT_SELECT,
    }),
    input.positionId === null
      ? null
      : context.prisma.eventPosition.findUnique({
          where: { id: input.positionId },
          select: { citizenId: true },
        }),
  ]);
  if (
    !event ||
    !isLineupPublished(event) ||
    position?.citizenId === input.citizenId
  )
    return null;

  return {
    event: { id: event.id, name: event.name },
    recipients: await findEventRecipients(
      context,
      event,
      { id: input.citizenId },
      { additionalPermissionSets: LINEUP_PERMISSION_SETS },
    ),
  };
};

/**
 * The organizers who hear that a participant cancelled and so vacated
 * positions (see `findEventOrganizerRecipients()`), when they can see the
 * lineup now (see `LINEUP_PERMISSION_SETS`)
 */
export const findEventPositionVacatedRecipients = (
  context: ApplicationContext,
  input: FindEventOrganizerRecipientsInput,
): Promise<EventOrganizerRecipients | null> =>
  findEventOrganizerRecipients(context, input, LINEUP_PERMISSION_SETS);
