import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { canSeeEvent } from "@/modules/events/utils/eventVisibility";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { isEventUpdatable } from "@/modules/events/utils/isEventUpdatable";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  WikiPageNamespace,
  type Event,
  type WikiPage,
} from "@sam-monorepo/database/client";
import {
  collectPositionScopeIdsForCitizen,
  resolveEventWikiPagePermissions,
  type EventWikiViewer,
  type ResolvedEventWikiPagePermissions,
} from "@sam-monorepo/permissions";
import { cache } from "react";
import type { WikiSharedContextPage } from "./getWikiContext";

/**
 * The shared page shape (so the tree, breadcrumb and sidebar utilities work
 * on both contexts) plus the event scope configuration. The role-based
 * columns are never loaded in the EVENT namespace.
 */
export type EventWikiContextPage = WikiSharedContextPage &
  Pick<
    WikiPage,
    | "eventReadScope"
    | "eventReadScopePositionId"
    | "eventEditScope"
    | "eventEditScopePositionId"
  >;

export interface EventWikiContextPosition {
  readonly id: string;
  readonly parentPositionId: string | null;
  readonly citizenId: string | null;
  readonly name: string;
  readonly order: number;
}

export interface EventWikiContext {
  event: Pick<
    Event,
    | "id"
    | "name"
    | "discordCreatorId"
    | "startTime"
    | "endTime"
    | "briefingPublishedAt"
  >;
  /** Flat lineup positions, e.g. for the POSITION scope picker */
  positions: EventWikiContextPosition[];
  viewer: EventWikiViewer;
  /** The event is over — every mutation is rejected, reading stays */
  frozen: boolean;
  /** All pages of the event, including soft-deleted ones */
  allPages: EventWikiContextPage[];
  /** Pages that are not soft-deleted */
  pages: EventWikiContextPage[];
  pagesById: Map<string, EventWikiContextPage>;
  /**
   * The single top-level "Briefing" page: the event wiki's homepage and the
   * gate — events without one (created before the feature) have no wiki.
   */
  rootPage: EventWikiContextPage | null;
  /** Effective permissions of the current viewer for every page */
  permissions: Map<string, ResolvedEventWikiPagePermissions>;
}

/**
 * The briefing gate: the event has a root page and the viewer can read it.
 * Holding a context (= `event;read`) is not enough — surfaces behind the
 * gate (layout, search, tag names, metadata) must behave as if the briefing
 * did not exist while this is false, or an unpublished briefing's existence
 * and tag names would leak to every `event;read` holder.
 */
export const hasReadableEventWikiRoot = (
  context: EventWikiContext,
): context is EventWikiContext & { rootPage: EventWikiContextPage } =>
  context.rootPage !== null &&
  context.permissions.get(context.rootPage.id)?.canRead === true;

/**
 * Loads one event's wiki pages and resolves the current viewer's effective
 * permissions once per request — the event-scoped counterpart of
 * `getWikiContext`. Everything event-wiki-related (tab gate, tree, page
 * views, actions) derives from this context. Returns null if the viewer is
 * unauthenticated, lacks `event;read` or the event does not exist; scope
 * ALL therefore simply means "everyone who gets this far".
 */
export const getEventWikiContext = cache(
  withTrace(
    "getEventWikiContext",
    async (eventId: Event["id"]): Promise<EventWikiContext | null> => {
      const authentication = await authenticate();
      if (!authentication) return null;
      if (!(await authentication.authorize("event", "read"))) return null;

      const citizenId = authentication.session.entity?.id ?? null;
      const discordUserId = authentication.session.discordId;

      const [event, participant, allPages] = await Promise.all([
        prisma.event.findUnique({
          where: { id: eventId },
          include: {
            managers: true,
            visibilityRoles: true,
            positions: {
              select: {
                id: true,
                parentPositionId: true,
                citizenId: true,
                name: true,
                order: true,
              },
            },
          },
        }),
        prisma.eventParticipant.findFirst({
          where: {
            eventId,
            cancelledAt: null,
            OR: [
              ...(discordUserId ? [{ discordUserId }] : []),
              ...(citizenId ? [{ citizenId }] : []),
            ],
          },
          select: { id: true },
        }),
        prisma.wikiPage.findMany({
          where: { namespace: WikiPageNamespace.EVENT, eventId },
          select: {
            id: true,
            parentId: true,
            title: true,
            slug: true,
            iconId: true,
            sortOrder: true,
            sidebarMode: true,
            imageUploadability: true,
            attachmentUploadability: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            deletedById: true,
            eventId: true,
            eventReadScope: true,
            eventReadScopePositionId: true,
            eventEditScope: true,
            eventEditScopePositionId: true,
          },
        }),
      ]);
      if (!event) return null;

      /**
       * Restricted or soft-deleted events must not leak through their wiki:
       * no context means every caller behaves as if the event did not exist.
       */
      if (!(await canSeeEvent(event))) return null;

      const viewer: EventWikiViewer = {
        isParticipant: participant !== null,
        isEventManager: await isAllowedToManageEvent(event),
        positionScopeIds: collectPositionScopeIdsForCitizen(
          event.positions,
          citizenId,
        ),
      };

      const frozen = !isEventUpdatable(event);
      const permissions = resolveEventWikiPagePermissions(allPages, viewer, {
        frozen,
      });
      const pages = allPages.filter((page) => page.deletedAt === null);

      /**
       * The seed guarantees a single top-level page; should corrupt data
       * ever produce several, the oldest one wins deterministically.
       */
      const rootPage =
        pages
          .filter((page) => page.parentId === null)
          .toSorted(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          )[0] ?? null;

      return {
        event: {
          id: event.id,
          name: event.name,
          discordCreatorId: event.discordCreatorId,
          startTime: event.startTime,
          endTime: event.endTime,
          briefingPublishedAt: event.briefingPublishedAt,
        },
        positions: event.positions,
        viewer,
        frozen,
        allPages,
        pages,
        pagesById: new Map(allPages.map((page) => [page.id, page])),
        rootPage,
        permissions,
      };
    },
  ),
);
