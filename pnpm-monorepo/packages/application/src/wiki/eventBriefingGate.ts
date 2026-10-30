import {
  WikiPageEventScope,
  WikiPageNamespace,
  type Event,
  type EventParticipant,
} from "@sam-monorepo/database/client";
import {
  collectPositionScopeIdsForCitizen,
  isEventWikiScopeAvailable,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  isAllowedToManageEvent,
  type EventManageInput,
} from "../events/eventManageRules.js";

/**
 * An event as a list of events gives it (see `EventListRow`). The
 * participants are the rows of the actor only. That is sufficient for the
 * check if the actor takes part.
 */
export type EventBriefingGateEvent = EventManageInput &
  Pick<Event, "id" | "participationEnabled"> & {
    readonly participants: readonly Pick<
      EventParticipant,
      "citizenId" | "discordUserId"
    >[];
  };

/**
 * Whether the actor can read the briefing of an event: the rule of the gate
 * of the briefing tab, from the root page alone (the root page has no parent
 * to inherit from or to be gated by). It is for the event tiles, which show
 * many events on one page: one indexed query of the root page for each
 * event, and the lineup only for a POSITION scope. The callers must check
 * `event;read` first, like each list of events.
 *
 * The check ignores the edit scope. The resolver gives the read access to
 * each actor that can edit, thus the edit scope could make the read access
 * wider. The result stays the same only because
 * `updateEventWikiPagePermissions()` keeps the edit scope a subset of the
 * read scope on each update of the root page (and the seed starts with
 * MANAGERS for both scopes). Without this rule, the tab and the tile could
 * show a briefing that the actor cannot read, or hide one that the actor
 * can read.
 */
export const canReadEventBriefing = async (
  context: ApplicationContext,
  actor: Actor,
  event: EventBriefingGateEvent,
): Promise<boolean> => {
  const rootPage = await context.prisma.wikiPage.findFirst({
    where: {
      namespace: WikiPageNamespace.EVENT,
      eventId: event.id,
      parentId: null,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { eventReadScope: true, eventReadScopePositionId: true },
  });
  if (!rootPage) return false;

  if (isAllowedToManageEvent(actor, event)) return true;

  if (
    !isEventWikiScopeAvailable(
      rootPage.eventReadScope,
      event.participationEnabled,
    )
  )
    return false;

  switch (rootPage.eventReadScope) {
    case WikiPageEventScope.ALL:
      return true;

    case WikiPageEventScope.PARTICIPANTS:
      return event.participants.some(
        (participant) =>
          (participant.discordUserId !== null &&
            participant.discordUserId === actor.discordUserId) ||
          (participant.citizenId !== null &&
            participant.citizenId === actor.citizen?.id),
      );

    case WikiPageEventScope.POSITION: {
      const citizenId = actor.citizen?.id ?? null;
      if (!rootPage.eventReadScopePositionId || !citizenId) return false;

      const positions = await context.prisma.eventPosition.findMany({
        where: { eventId: event.id },
        select: { id: true, parentPositionId: true, citizenId: true },
      });
      return collectPositionScopeIdsForCitizen(positions, citizenId).has(
        rootPage.eventReadScopePositionId,
      );
    }

    case WikiPageEventScope.MANAGERS:
      return false;

    /**
     * A root page cannot have this scope. The resolver then gives the access
     * only to the managers.
     */
    case WikiPageEventScope.INHERIT:
      return false;

    default:
      throw new Error(
        `Unexpected scope: ${rootPage.eventReadScope satisfies never}`,
      );
  }
};
