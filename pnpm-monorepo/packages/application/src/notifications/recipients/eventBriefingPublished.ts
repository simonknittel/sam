import {
  WikiPageEventScope,
  WikiPageNamespace,
} from "@sam-monorepo/database/browser";
import { collectPositionScopeIdsForCitizen } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";
import { findEventCreatedRecipients } from "./eventCreated.js";
import { findEventParticipantRecipients } from "./eventParticipants.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";

export interface FindEventBriefingPublishedRecipientsInput {
  readonly eventId: string;
}

const findPositionScopeRecipients = async (
  context: ApplicationContext,
  eventId: string,
  scopePositionId: string,
): Promise<EventNotificationRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      ...EVENT_RECIPIENT_SELECT,
      positions: {
        select: {
          id: true,
          parentPositionId: true,
          citizenId: true,
        },
      },
    },
  });
  if (!event) return null;

  // The rule of the briefing gate: a citizen with a position in the subtree
  // of the scope position
  const citizenIds = [
    ...new Set(
      event.positions.flatMap((position) =>
        position.citizenId ? [position.citizenId] : [],
      ),
    ),
  ].filter((citizenId) =>
    collectPositionScopeIdsForCitizen(event.positions, citizenId).has(
      scopePositionId,
    ),
  );
  if (citizenIds.length <= 0) return null;

  return {
    event: { id: event.id, name: event.name },
    recipients: await findEventRecipients(context, event, {
      id: { in: citizenIds },
    }),
  };
};

/**
 * The audience of the current read scope of the root page of the briefing
 * (the same root page as `canReadEventBriefing()`), thus nobody hears about
 * a briefing that they cannot open. The scope can change after the request,
 * thus the rule reads it again. Null when the event, the root page, the
 * position or the audience does not exist, or when only the managers can
 * read the briefing.
 */
export const findEventBriefingPublishedRecipients = async (
  context: ApplicationContext,
  input: FindEventBriefingPublishedRecipientsInput,
): Promise<EventNotificationRecipients | null> => {
  const rootPage = await context.prisma.wikiPage.findFirst({
    where: {
      namespace: WikiPageNamespace.EVENT,
      eventId: input.eventId,
      parentId: null,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { eventReadScope: true, eventReadScopePositionId: true },
  });
  if (!rootPage) return null;

  switch (rootPage.eventReadScope) {
    case WikiPageEventScope.PARTICIPANTS:
      return findEventParticipantRecipients(context, {
        eventId: input.eventId,
      });

    case WikiPageEventScope.POSITION:
      if (!rootPage.eventReadScopePositionId) return null;

      return findPositionScopeRecipients(
        context,
        input.eventId,
        rootPage.eventReadScopePositionId,
      );

    case WikiPageEventScope.ALL:
      return findEventCreatedRecipients(context, { eventId: input.eventId });

    // Only the managers can read the briefing. A root page cannot have the
    // scope INHERIT: the resolver then gives the access only to the managers.
    case WikiPageEventScope.MANAGERS:
    case WikiPageEventScope.INHERIT:
      return null;

    default:
      throw new Error(
        `Unknown read scope: ${rootPage.eventReadScope satisfies never}`,
      );
  }
};
