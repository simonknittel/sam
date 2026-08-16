import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import {
  WikiPageEventScope,
  WikiPageNamespace,
  type Entity,
  type Event,
  type EventParticipant,
} from "@sam-monorepo/database/client";
import { collectPositionScopeIdsForCitizen } from "@sam-monorepo/permissions";

/**
 * Whether the current viewer may read an event's briefing — the same rule
 * that gates the Briefing tab, evaluated from the root page alone (it has
 * no parent to inherit from or be gated by). Built for event tiles, which
 * render several events per page: one indexed root-page lookup per event,
 * plus the lineup only when a POSITION scope asks for it. Callers must
 * have checked `event;read`, like every event list does.
 *
 * Deliberately ignores the edit scope although the resolver's "may edit ⇒
 * may read" implication could widen reading: this stays equivalent only
 * because `updateEventWikiPagePermissions` enforces edit ⊆ read on every
 * root update (and the seed starts at MANAGERS/MANAGERS). Relaxing that
 * subset rule would silently desync tab and tile visibility from actual
 * readability.
 */
export const canReadEventBriefing = async (
  event: Pick<Event, "id" | "discordCreatorId"> & {
    readonly managers: Entity[];
    readonly participants: EventParticipant[];
  },
): Promise<boolean> => {
  const authentication = await authenticate();
  if (!authentication) return false;

  const rootPage = await prisma.wikiPage.findFirst({
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

  if (await isAllowedToManageEvent(event)) return true;

  switch (rootPage.eventReadScope) {
    case WikiPageEventScope.ALL:
      return true;

    case WikiPageEventScope.PARTICIPANTS:
      return event.participants.some(
        (participant) =>
          participant.discordUserId === authentication.session.discordId,
      );

    case WikiPageEventScope.POSITION: {
      const citizenId = authentication.session.entity?.id ?? null;
      if (!rootPage.eventReadScopePositionId || !citizenId) return false;

      const positions = await prisma.eventPosition.findMany({
        where: { eventId: event.id },
        select: { id: true, parentPositionId: true, citizenId: true },
      });
      return collectPositionScopeIdsForCitizen(positions, citizenId).has(
        rootPage.eventReadScopePositionId,
      );
    }

    case WikiPageEventScope.MANAGERS:
      return false;

    /** Not allowed on root pages; the resolver's fallback is managers-only */
    case WikiPageEventScope.INHERIT:
      return false;

    default:
      throw new Error(
        `Unexpected scope: ${rootPage.eventReadScope satisfies never}`,
      );
  }
};
