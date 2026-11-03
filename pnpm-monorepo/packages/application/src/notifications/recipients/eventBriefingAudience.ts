import {
  WikiPageEventScope,
  WikiPageNamespace,
} from "@sam-monorepo/database/browser";
import type { WikiPage } from "@sam-monorepo/database/client";
import { collectPositionScopeIdsForCitizen } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";
import { findEventCreatedRecipients } from "./eventCreated.js";
import {
  EVENT_ORGANIZER_SELECT,
  findEventOrganizers,
} from "./eventOrganizers.js";
import { findEventParticipantRecipients } from "./eventParticipants.js";
import {
  EVENT_RECIPIENT_SELECT,
  findEventRecipients,
  type EventNotificationRecipients,
} from "./eventRecipients.js";

export interface FindEventBriefingAudienceRecipientsInput {
  readonly eventId: string;
  /** The citizen who caused the notification gets none */
  readonly excludedCitizenId?: string | null;
}

const findPositionScopeRecipients = async (
  context: ApplicationContext,
  input: FindEventBriefingAudienceRecipientsInput,
  scopePositionId: string,
): Promise<EventNotificationRecipients | null> => {
  const event = await context.prisma.event.findUnique({
    where: { id: input.eventId },
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
    recipients: await findEventRecipients(
      context,
      event,
      { id: { in: citizenIds } },
      { excludedCitizenId: input.excludedCitizenId },
    ),
  };
};

/**
 * The root page of the briefing: the same root page as
 * `canReadEventBriefing()`
 */
const findBriefingRootPage = (context: ApplicationContext, eventId: string) =>
  context.prisma.wikiPage.findFirst({
    where: {
      namespace: WikiPageNamespace.EVENT,
      eventId,
      parentId: null,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { eventReadScope: true, eventReadScopePositionId: true },
  });

const findAudience = async (
  context: ApplicationContext,
  input: FindEventBriefingAudienceRecipientsInput,
  rootPage: Pick<WikiPage, "eventReadScope" | "eventReadScopePositionId">,
): Promise<EventNotificationRecipients | null> => {
  switch (rootPage.eventReadScope) {
    case WikiPageEventScope.PARTICIPANTS:
      return findEventParticipantRecipients(context, input);

    case WikiPageEventScope.POSITION:
      if (!rootPage.eventReadScopePositionId) return null;

      return findPositionScopeRecipients(
        context,
        input,
        rootPage.eventReadScopePositionId,
      );

    case WikiPageEventScope.ALL:
      return findEventCreatedRecipients(context, input);

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

/**
 * The audience of the current read scope of the root page of the briefing
 * (see `findBriefingRootPage()`), without the excluded citizen. Thus nobody
 * hears about a briefing that they cannot open. The scope can change after
 * the request, thus the rule reads it again. Null when the event, the root
 * page, the position or the audience does not exist, or when only the
 * managers can read the briefing.
 */
export const findEventBriefingAudienceRecipients = async (
  context: ApplicationContext,
  input: FindEventBriefingAudienceRecipientsInput,
): Promise<EventNotificationRecipients | null> => {
  const rootPage = await findBriefingRootPage(context, input.eventId);
  if (!rootPage) return null;

  return findAudience(context, input, rootPage);
};

/**
 * The audience of the read scope (see
 * `findEventBriefingAudienceRecipients()`) and the organizers of the event
 * (see `findEventOrganizers()`): the organizers can read the briefing at
 * each scope (see `canReadEventBriefing()`). Without the excluded citizen.
 * Null when the event or the root page does not exist.
 */
export const findEventBriefingUpdatedRecipients = async (
  context: ApplicationContext,
  input: FindEventBriefingAudienceRecipientsInput,
): Promise<EventNotificationRecipients | null> => {
  const [event, rootPage] = await Promise.all([
    context.prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, name: true, ...EVENT_ORGANIZER_SELECT },
    }),
    findBriefingRootPage(context, input.eventId),
  ]);
  if (!event || !rootPage) return null;

  const [audience, organizers] = await Promise.all([
    findAudience(context, input, rootPage),
    findEventOrganizers(context, event, {
      excludedCitizenId: input.excludedCitizenId,
    }),
  ]);
  const citizenIds = new Set(
    [...(audience?.recipients ?? []), ...organizers].map(
      (recipient) => recipient.citizenId,
    ),
  );

  return {
    event: { id: event.id, name: event.name },
    recipients: Array.from(citizenIds, (citizenId) => ({ citizenId })),
  };
};
