import {
  WikiPageNamespace,
  type Event,
  type WikiPage,
} from "@sam-monorepo/database/client";
import {
  collectPositionScopeIdsForCitizen,
  createBriefingWikiHrefBase,
  resolveEventWikiPagePermissions,
  toEventContainer,
  WikiScopeKind,
  type EventContainer,
  type EventWikiViewer,
  type ResolvedEventWikiPagePermissions,
} from "@sam-monorepo/domain";
import type { WikiPageHrefBase } from "@sam-monorepo/wiki-editor/helpers";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  isAllowedToManageEvent,
  isEventUpdatable,
} from "../events/eventManageRules.js";
import { canActorSeeEvent } from "../events/eventVisibility.js";
import { withSpan } from "../withSpan.js";
import type { WikiSharedContextPage } from "./wikiContext.js";

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

/**
 * The briefing of an event or of an event template: one of the wiki scopes
 * (see `wikiScope.ts`)
 */
export interface EventWikiContext {
  readonly kind: WikiScopeKind.Briefing;
  /** The event or the event template that the briefing belongs to */
  readonly container: EventContainer;
  /** The routes of the pages */
  readonly hrefBase: WikiPageHrefBase;
  /** Name of the container, for headings and page titles */
  name: string;
  /**
   * The owning event, NULL inside a template blueprint. Everything that only
   * exists on a real event — the participation-driven scopes, the freeze, the
   * one-time "briefing published" notification — keys off this.
   */
  event: Pick<
    Event,
    | "id"
    | "name"
    | "discordCreatorId"
    | "startTime"
    | "endTime"
    | "briefingPublishedAt"
    | "participationEnabled"
  > | null;
  /** Flat lineup positions, e.g. for the POSITION scope picker */
  positions: EventWikiContextPosition[];
  viewer: EventWikiViewer;
  /** The event is over — every mutation is rejected, reading stays */
  frozen: boolean;
  /** All pages of the container, including soft-deleted ones */
  allPages: EventWikiContextPage[];
  /** Pages that are not soft-deleted */
  pages: EventWikiContextPage[];
  pagesById: Map<string, EventWikiContextPage>;
  /**
   * The single top-level "Briefing" page: the briefing's homepage and the
   * gate — events without one (created before the feature) have no wiki.
   */
  rootPage: EventWikiContextPage | null;
  /** Effective permissions of the current viewer for every page */
  permissions: Map<string, ResolvedEventWikiPagePermissions>;
}

export const EVENT_WIKI_PAGE_SELECT = {
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
  templateId: true,
  eventReadScope: true,
  eventReadScopePositionId: true,
  eventEditScope: true,
  eventEditScopePositionId: true,
} as const;

export const EVENT_WIKI_POSITION_SELECT = {
  id: true,
  parentPositionId: true,
  citizenId: true,
  name: true,
  order: true,
} as const;

/**
 * The briefing gate: the container has a root page and the viewer can read
 * it. Holding a context (= `event;read`) is not enough — surfaces behind the
 * gate (layout, search, tag names, metadata) must behave as if the briefing
 * did not exist while this is false, or an unpublished briefing's existence
 * and tag names would leak to every `event;read` holder.
 */
export const hasReadableEventWikiRoot = <
  Context extends Pick<EventWikiContext, "rootPage" | "permissions">,
>(
  context: Context,
): context is Context & { rootPage: EventWikiContextPage } =>
  context.rootPage !== null &&
  context.permissions.get(context.rootPage.id)?.canRead === true;

/**
 * The seed guarantees a single top-level page; should corrupt data ever
 * produce several, the oldest one wins deterministically.
 */
export const pickEventWikiRootPage = <
  Page extends Pick<WikiPage, "parentId" | "createdAt">,
>(
  pages: readonly Page[],
) =>
  pages
    .filter((page) => page.parentId === null)
    .toSorted(
      (first, second) => first.createdAt.getTime() - second.createdAt.getTime(),
    )[0] ?? null;

export interface BuildEventWikiContextInput {
  readonly event_id: string;
}

/**
 * Loads the briefing pages of an event and resolves the effective
 * permissions of the actor — the event counterpart of `buildWikiContext()`.
 * Returns null if the actor may not hold it: no `event;read`, an unknown
 * event or an event that the actor cannot see.
 */
export const buildEventWikiContext = (
  context: ApplicationContext,
  actor: Actor,
  { event_id: eventId }: BuildEventWikiContextInput,
): Promise<EventWikiContext | null> =>
  withSpan(context, "buildEventWikiContext", async () => {
    if (!actor.authorize("event", "read")) return null;

    const citizenId = actor.citizen?.id ?? null;
    const { discordUserId } = actor;

    const [event, allPages] = await Promise.all([
      context.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          visibility: true,
          deletedAt: true,
          createdById: true,
          discordCreatorId: true,
          startTime: true,
          endTime: true,
          briefingPublishedAt: true,
          participationEnabled: true,
          managers: { select: { id: true } },
          visibilityRoles: { select: { roleId: true } },
          positions: { select: EVENT_WIKI_POSITION_SELECT },
        },
      }),
      context.prisma.wikiPage.findMany({
        where: {
          namespace: WikiPageNamespace.EVENT,
          eventId,
          templateId: null,
        },
        select: EVENT_WIKI_PAGE_SELECT,
      }),
    ]);
    if (!event) return null;

    /**
     * Restricted or soft-deleted events must not leak through their wiki: no
     * context means every caller behaves as if the event did not exist.
     */
    if (!canActorSeeEvent(actor, event)) return null;

    const participant =
      discordUserId || citizenId
        ? await context.prisma.eventParticipant.findFirst({
            where: {
              eventId,
              cancelledAt: null,
              OR: [
                ...(discordUserId ? [{ discordUserId }] : []),
                ...(citizenId ? [{ citizenId }] : []),
              ],
            },
            select: { id: true },
          })
        : null;

    const viewer: EventWikiViewer = {
      isParticipant: participant !== null,
      isEventManager: isAllowedToManageEvent(actor, event),
      positionScopeIds: collectPositionScopeIdsForCitizen(
        event.positions,
        citizenId,
      ),
    };

    const frozen = !isEventUpdatable(event, context.now());
    const permissions = resolveEventWikiPagePermissions(allPages, viewer, {
      frozen,
      participationEnabled: event.participationEnabled,
    });
    const pages = allPages.filter((page) => page.deletedAt === null);
    const rootPage = pickEventWikiRootPage(pages);
    const container = toEventContainer(event.id);

    return {
      kind: WikiScopeKind.Briefing,
      container,
      hrefBase: createBriefingWikiHrefBase(container, rootPage?.id ?? null),
      name: event.name,
      event: {
        id: event.id,
        name: event.name,
        discordCreatorId: event.discordCreatorId,
        startTime: event.startTime,
        endTime: event.endTime,
        briefingPublishedAt: event.briefingPublishedAt,
        participationEnabled: event.participationEnabled,
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
  });
