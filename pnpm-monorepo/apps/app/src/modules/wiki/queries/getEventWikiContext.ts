import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import {
  EventContainerKind,
  eventContainerColumns,
  type EventContainer,
} from "@/modules/events/utils/eventContainer";
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
  /** The event or the template blueprint this briefing belongs to */
  container: EventContainer;
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

const PAGE_SELECT = {
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

const POSITION_SELECT = {
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
export const hasReadableEventWikiRoot = (
  context: EventWikiContext,
): context is EventWikiContext & { rootPage: EventWikiContextPage } =>
  context.rootPage !== null &&
  context.permissions.get(context.rootPage.id)?.canRead === true;

/**
 * The seed guarantees a single top-level page; should corrupt data ever
 * produce several, the oldest one wins deterministically.
 */
const pickRootPage = (pages: EventWikiContextPage[]) =>
  pages
    .filter((page) => page.parentId === null)
    .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ??
  null;

/**
 * Loads one container's briefing pages and resolves the current viewer's
 * effective permissions once per request — the container-scoped counterpart
 * of `getWikiContext`. Everything briefing-related (tab gate, tree, page
 * views, actions) derives from this context. Returns null if the viewer may
 * not hold it: unauthenticated, missing `event;read`, an event they cannot
 * see, or a template they have no access to.
 */
export const getEventWikiContext = cache(
  withTrace(
    "getEventWikiContext",
    async (container: EventContainer): Promise<EventWikiContext | null> => {
      switch (container.kind) {
        case EventContainerKind.Event:
          return await loadEventBriefingContext(container);

        case EventContainerKind.Template:
          return await loadTemplateBriefingContext(container);

        default:
          throw new Error(
            `Unknown event container kind: ${container.kind satisfies never}`,
          );
      }
    },
  ),
);

const loadEventBriefingContext = async (
  container: EventContainer,
): Promise<EventWikiContext | null> => {
  const authentication = await authenticate();
  if (!authentication) return null;
  if (!(await authentication.authorize("event", "read"))) return null;

  const citizenId = authentication.session.entity?.id ?? null;
  const discordUserId = authentication.session.discordId;

  const [event, participant, allPages] = await Promise.all([
    prisma.event.findUnique({
      where: { id: container.id },
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
        managers: { select: { id: true } },
        visibilityRoles: { select: { roleId: true } },
        positions: { select: POSITION_SELECT },
      },
    }),
    prisma.eventParticipant.findFirst({
      where: {
        eventId: container.id,
        cancelledAt: null,
        OR: [
          ...(discordUserId ? [{ discordUserId }] : []),
          ...(citizenId ? [{ citizenId }] : []),
        ],
      },
      select: { id: true },
    }),
    prisma.wikiPage.findMany({
      where: {
        namespace: WikiPageNamespace.EVENT,
        ...eventContainerColumns(container),
      },
      select: PAGE_SELECT,
    }),
  ]);
  if (!event) return null;

  /**
   * Restricted or soft-deleted events must not leak through their wiki: no
   * context means every caller behaves as if the event did not exist.
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

  return {
    container,
    name: event.name,
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
    rootPage: pickRootPage(pages),
    permissions,
  };
};

/**
 * A template's briefing is a blueprint, so the per-page event scopes are
 * stored metadata that only takes effect once the tree is copied into an
 * event. Access is decided by the template's own ACL instead: reading the
 * template reads every page of its briefing, editing it edits and
 * administrates them. The scope source ids stay resolved from the real
 * hierarchy so the scope editor keeps showing where a value comes from.
 */
const loadTemplateBriefingContext = async (
  container: EventContainer,
): Promise<EventWikiContext | null> => {
  const templateContext = await getEventTemplateById(container.id);
  if (!templateContext) return null;

  const canEdit =
    templateContext.permissions.canEdit &&
    templateContext.template.deletedAt === null;

  const [positions, allPages] = await Promise.all([
    prisma.eventPosition.findMany({
      where: eventContainerColumns(container),
      select: POSITION_SELECT,
    }),
    prisma.wikiPage.findMany({
      where: {
        namespace: WikiPageNamespace.EVENT,
        ...eventContainerColumns(container),
      },
      select: PAGE_SELECT,
    }),
  ]);

  const viewer: EventWikiViewer = {
    isParticipant: false,
    isEventManager: canEdit,
    positionScopeIds: new Set(),
  };

  const resolved = resolveEventWikiPagePermissions(allPages, viewer, {
    frozen: false,
  });
  const permissions = new Map(
    [...resolved].map(([pageId, pagePermissions]) => [
      pageId,
      {
        ...pagePermissions,
        canRead: true,
        canEdit,
        canAdmin: canEdit,
        canUploadImages: canEdit,
        canUploadAttachments: canEdit,
      },
    ]),
  );
  const pages = allPages.filter((page) => page.deletedAt === null);

  return {
    container,
    name: templateContext.template.name,
    event: null,
    positions,
    viewer,
    frozen: false,
    allPages,
    pages,
    pagesById: new Map(allPages.map((page) => [page.id, page])),
    rootPage: pickRootPage(pages),
    permissions,
  };
};
