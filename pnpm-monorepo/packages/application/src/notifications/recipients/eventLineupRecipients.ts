import type { Event, Prisma } from "@sam-monorepo/database/client";
import type { ApplicationContext } from "../../context.js";
import { findEventPositionTree } from "../../lineup/lineupOutput.js";
import { findEventParticipantRecipients } from "./eventParticipants.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";
import type { Recipient } from "./recipient.js";

/**
 * The participants see the lineup only after a manager published it, and
 * only while the participation is on (see `isLineupVisible()`). Thus a
 * change of a draft lineup notifies nobody: the publication tells each
 * participant the own positions.
 */
const isLineupPublished = (
  event: Pick<Event, "lineupEnabled" | "participationEnabled">,
) => event.lineupEnabled && event.participationEnabled;

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
  readonly citizenId: string | null;
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
 * The participants of the event who can see it now (see
 * `findEventParticipantRecipients()`), each with the own positions. Null
 * when the event does not exist, has no active participant, or when the
 * participants do not see the lineup anymore.
 */
export const findEventLineupEnabledRecipients = async (
  context: ApplicationContext,
  input: { readonly eventId: string },
): Promise<EventLineupEnabledRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: { id: input.eventId },
    select: { lineupEnabled: true, participationEnabled: true },
  });
  if (!event || !isLineupPublished(event)) return null;

  const result = await findEventParticipantRecipients(context, input);
  if (!result) return null;

  const assignedPositions = flattenPositionTree(
    await findEventPositionTree(context, input.eventId),
  ).filter((position) => position.citizenId !== null);
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
 * sees the lineup and can see the event now (see `findEventRecipients()`).
 * Null when the position does not exist anymore, a later change gave it to a
 * different citizen (that change notifies on its own), or when the
 * participants do not see the lineup.
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
    recipients: await findEventRecipients(context, position.event, {
      id: input.citizenId,
    }),
  };
};

/**
 * The citizen who lost a position, when the citizen sees the lineup and can
 * see the event now (see `findEventRecipients()`). The position can be
 * deleted, thus the rule does not read it. Null when the event does not
 * exist or when the participants do not see the lineup.
 */
export const findEventPositionUnassignedRecipient = async (
  context: ApplicationContext,
  input: { readonly eventId: string; readonly citizenId: string },
): Promise<EventNotificationRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: { id: input.eventId },
    select: LINEUP_EVENT_RECIPIENT_SELECT,
  });
  if (!event || !isLineupPublished(event)) return null;

  return {
    event: { id: event.id, name: event.name },
    recipients: await findEventRecipients(context, event, {
      id: input.citizenId,
    }),
  };
};
