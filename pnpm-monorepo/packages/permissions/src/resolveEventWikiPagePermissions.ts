import {
  WikiPageEventScope,
  WikiPageUploadability,
} from "@sam-monorepo/database/browser";
import {
  findWikiPageSettingSource,
  resolveWikiPageTier,
} from "./wikiPageHierarchy.js";

export interface EventWikiPagePermissionSource {
  readonly id: string;
  readonly parentId: string | null;
  readonly eventReadScope: WikiPageEventScope;
  readonly eventReadScopePositionId: string | null;
  readonly eventEditScope: WikiPageEventScope;
  readonly eventEditScopePositionId: string | null;
  /** The same upload tiers the role-based wiki uses (see WikiPage) */
  readonly imageUploadability: WikiPageUploadability;
  readonly attachmentUploadability: WikiPageUploadability;
}

export interface EventWikiViewer {
  /** Has a Discord RSVP on the event */
  readonly isParticipant: boolean;
  /** Organizer, event manager or `event;manage` — the fixed manage tier */
  readonly isEventManager: boolean;
  /**
   * Ids of every position whose subtree contains a position the viewer is
   * assigned to (each assigned position plus all of its ancestors). A page
   * scoped to POSITION grants exactly when its referenced position id is in
   * this set. See `collectPositionScopeIdsForCitizen`.
   */
  readonly positionScopeIds: ReadonlySet<string>;
}

export interface ResolvedEventWikiPagePermissions {
  readonly canRead: boolean;
  /** Already accounts for the post-event freeze */
  readonly canEdit: boolean;
  /**
   * Stays true for event managers after the freeze so read-only manage
   * views (snapshot history, trash) keep working; every mutation
   * additionally checks the freeze itself.
   */
  readonly canAdmin: boolean;
  /**
   * Same semantics as the role-based wiki: EDITORS extends uploading to
   * everyone with edit permission, RESTRICTED (and the INHERIT fallback)
   * keeps it at the managers. Nobody uploads once the event is over.
   */
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
  /**
   * Page whose explicit (non-INHERIT) scope supplied the effective value.
   * Equals the page's own id if it doesn't inherit. Falls back to the last
   * reachable ancestor of a fully-inheriting chain, whose scope stays
   * INHERIT and reads as "managers only".
   */
  readonly readScopeSourceId: string;
  readonly editScopeSourceId: string;
  readonly imageUploadabilitySourceId: string;
  readonly attachmentUploadabilitySourceId: string;
}

interface FlatPositionAssignment {
  readonly id: string;
  readonly parentPositionId: string | null;
  readonly citizenId: string | null;
}

/**
 * Precomputes the POSITION scope membership of one citizen: every position
 * the citizen is assigned to plus all of its ancestors. A scope referencing
 * position P covers assignments anywhere in P's subtree, which is
 * equivalent to P being an ancestor-or-self of an assigned position. The
 * visited set keeps a corrupted lineup from looping forever.
 */
export const collectPositionScopeIdsForCitizen = (
  positions: readonly FlatPositionAssignment[],
  citizenId: string | null,
): Set<string> => {
  const scopeIds = new Set<string>();
  if (!citizenId) return scopeIds;

  const parentIdsById = new Map(
    positions.map((position) => [position.id, position.parentPositionId]),
  );

  for (const position of positions) {
    if (position.citizenId !== citizenId) continue;

    let currentId: string | null = position.id;
    while (currentId && !scopeIds.has(currentId)) {
      scopeIds.add(currentId);
      currentId = parentIdsById.get(currentId) ?? null;
    }
  }

  return scopeIds;
};

type ScopeTier =
  "read" | "edit" | "imageUploadability" | "attachmentUploadability";

const hasExplicitSetting = (
  page: EventWikiPagePermissionSource,
  tier: ScopeTier,
) => {
  switch (tier) {
    case "read":
      return page.eventReadScope !== WikiPageEventScope.INHERIT;
    case "edit":
      return page.eventEditScope !== WikiPageEventScope.INHERIT;
    case "imageUploadability":
      return page.imageUploadability !== WikiPageUploadability.INHERIT;
    case "attachmentUploadability":
      return page.attachmentUploadability !== WikiPageUploadability.INHERIT;
    default:
      throw new Error(`Unexpected tier: ${tier satisfies never}`);
  }
};

/**
 * Nearest page with an explicit scope for the given tier, via the shared
 * hierarchy walk. Used for the sourceId display and the upload tiers — the
 * read/edit grant checks resolve INHERIT recursively through the parent
 * gate instead.
 */
const findScopeSource = (
  page: EventWikiPagePermissionSource,
  tier: ScopeTier,
  pagesById: ReadonlyMap<string, EventWikiPagePermissionSource>,
  cache: Map<string, EventWikiPagePermissionSource>,
) =>
  findWikiPageSettingSource(page, pagesById, cache, (candidate) =>
    hasExplicitSetting(candidate, tier),
  );

/**
 * Resolves the permissions of one viewer against the pages of one event
 * wiki, memoized per page. Pass all pages of the event including
 * soft-deleted ones (trash restore/destroy need permissions on them).
 *
 * The hierarchy semantics mirror `createWikiPagePermissionResolver` — only
 * the membership checks differ (event scopes instead of roles):
 * - The manage tier is fixed: event managers hold all tiers on every page.
 *   There is no owner concept and no per-page admin configuration.
 * - A page grants nothing to someone who cannot read its parent.
 * - PARTICIPANTS and POSITION are absolute memberships; ALL means everyone
 *   who reaches the event (the context loader only builds a context for
 *   viewers with `event;read`). Edit scope ALL means "everyone who may read
 *   this page", like editability ALL in the role-based resolver, so an open
 *   edit scope below a restricted read scope stays as narrow as the page.
 * - Tiers imply the lower ones: manage ⇒ edit ⇒ read. The read implication
 *   uses the unfrozen edit grant, so viewers whose read access comes from
 *   an edit scope keep reading after the event is over.
 * - INHERIT without a reachable parent (top-level page, broken chain,
 *   cycle) is the most restrictive value: managers only. Root pages are
 *   validated to always carry explicit scopes; this is the safety net.
 * - MANAGERS as an explicit scope grants nothing beyond the fixed manage
 *   tier — it is the "private" value.
 * - After the event is over (`frozen`) canEdit is false for everyone;
 *   reading and the managers' canAdmin stay.
 */
export const createEventWikiPagePermissionResolver = (
  pages: readonly EventWikiPagePermissionSource[],
  viewer: EventWikiViewer,
  options: { readonly frozen: boolean },
) => {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const readScopeSourceCache = new Map<string, EventWikiPagePermissionSource>();
  const editScopeSourceCache = new Map<string, EventWikiPagePermissionSource>();
  const imageUploadabilitySourceCache = new Map<
    string,
    EventWikiPagePermissionSource
  >();
  const attachmentUploadabilitySourceCache = new Map<
    string,
    EventWikiPagePermissionSource
  >();

  const editGrantCache = new Map<string, boolean>();
  const readGrantCache = new Map<string, boolean>();
  const readCache = new Map<string, boolean>();
  /**
   * Pages currently on the recursion stack, one set per tier: read depends
   * on the edit grant of the same page, so a shared set would mistake that
   * for a cycle.
   */
  const editGrantPending = new Set<string>();
  const readGrantPending = new Set<string>();
  const readPending = new Set<string>();

  const parentOf = (page: EventWikiPagePermissionSource) =>
    page.parentId ? pagesById.get(page.parentId) : undefined;

  const isScopeMember = (
    scope: WikiPageEventScope,
    positionId: string | null,
  ) => {
    switch (scope) {
      case WikiPageEventScope.ALL:
        return true;
      case WikiPageEventScope.PARTICIPANTS:
        return viewer.isParticipant;
      case WikiPageEventScope.POSITION:
        return positionId !== null && viewer.positionScopeIds.has(positionId);
      case WikiPageEventScope.MANAGERS:
        return false;
      case WikiPageEventScope.INHERIT:
        return false;
      default:
        throw new Error(`Unexpected scope: ${scope satisfies never}`);
    }
  };

  /**
   * The gate every tier passes through: a page hands out nothing to someone
   * who cannot read the page above it. Top-level pages have nothing to be
   * gated by; a page whose parent is missing from the data counts as
   * top-level.
   */
  const isAccessible = (page: EventWikiPagePermissionSource) => {
    const parent = parentOf(page);
    return parent ? canReadOf(parent) : true;
  };

  /**
   * What the page's own read scope grants, without the "may edit ⇒ may
   * read" implication and without the parent gate. Edit scope ALL is
   * defined on top of it, so the two must not be expressed through each
   * other.
   */
  const hasReadGrant = (page: EventWikiPagePermissionSource): boolean =>
    resolveWikiPageTier(page, readGrantCache, readGrantPending, () => {
      /** No own restriction; a top-level page has nothing to inherit */
      if (page.eventReadScope === WikiPageEventScope.INHERIT)
        return Boolean(parentOf(page));

      return isScopeMember(page.eventReadScope, page.eventReadScopePositionId);
    });

  /**
   * The edit grant ignoring the freeze: the "may edit ⇒ may read"
   * implication builds on it, and reading must survive the freeze.
   */
  const hasEditGrantOf = (page: EventWikiPagePermissionSource): boolean =>
    resolveWikiPageTier(page, editGrantCache, editGrantPending, () => {
      if (viewer.isEventManager) return true;
      if (!isAccessible(page)) return false;

      if (page.eventEditScope === WikiPageEventScope.INHERIT) {
        const parent = parentOf(page);
        return parent ? hasEditGrantOf(parent) : false;
      }
      if (page.eventEditScope === WikiPageEventScope.ALL)
        return hasReadGrant(page);

      return isScopeMember(page.eventEditScope, page.eventEditScopePositionId);
    });

  const canReadOf = (page: EventWikiPagePermissionSource): boolean =>
    resolveWikiPageTier(page, readCache, readPending, () => {
      if (viewer.isEventManager) return true;
      if (hasEditGrantOf(page)) return true;
      return isAccessible(page) && hasReadGrant(page);
    });

  /**
   * EDITORS extends uploading to everyone with edit permission, RESTRICTED
   * keeps it at the managers, and the fallback source of a fully-INHERIT
   * chain behaves like RESTRICTED — mirroring `isGrantedUpload` of the
   * role-based resolver. The freeze stops all uploading.
   */
  const isGrantedUpload = (
    uploadability: WikiPageUploadability,
    canEdit: boolean,
  ) => {
    if (options.frozen) return false;
    switch (uploadability) {
      case WikiPageUploadability.EDITORS:
        return canEdit;
      case WikiPageUploadability.RESTRICTED:
        return viewer.isEventManager;
      case WikiPageUploadability.INHERIT:
        return viewer.isEventManager;
      default:
        throw new Error(
          `Unexpected uploadability: ${uploadability satisfies never}`,
        );
    }
  };

  const get = (
    pageId: string,
  ): ResolvedEventWikiPagePermissions | undefined => {
    const page = pagesById.get(pageId);
    if (!page) return undefined;

    const canEdit = hasEditGrantOf(page) && !options.frozen;

    const imageUploadabilitySource = findScopeSource(
      page,
      "imageUploadability",
      pagesById,
      imageUploadabilitySourceCache,
    );
    const attachmentUploadabilitySource = findScopeSource(
      page,
      "attachmentUploadability",
      pagesById,
      attachmentUploadabilitySourceCache,
    );

    return {
      canRead: canReadOf(page),
      canEdit,
      canAdmin: viewer.isEventManager,
      canUploadImages: isGrantedUpload(
        imageUploadabilitySource.imageUploadability,
        canEdit,
      ),
      canUploadAttachments: isGrantedUpload(
        attachmentUploadabilitySource.attachmentUploadability,
        canEdit,
      ),
      readScopeSourceId: findScopeSource(
        page,
        "read",
        pagesById,
        readScopeSourceCache,
      ).id,
      editScopeSourceId: findScopeSource(
        page,
        "edit",
        pagesById,
        editScopeSourceCache,
      ).id,
      imageUploadabilitySourceId: imageUploadabilitySource.id,
      attachmentUploadabilitySourceId: attachmentUploadabilitySource.id,
    };
  };

  return { get };
};

/**
 * Resolves the effective permissions of the given viewer for every given
 * page — see `createEventWikiPagePermissionResolver()` for the grant rules.
 */
export const resolveEventWikiPagePermissions = (
  pages: readonly EventWikiPagePermissionSource[],
  viewer: EventWikiViewer,
  options: { readonly frozen: boolean },
) => {
  const resolver = createEventWikiPagePermissionResolver(
    pages,
    viewer,
    options,
  );

  const result = new Map<string, ResolvedEventWikiPagePermissions>();
  for (const page of pages) {
    const permissions = resolver.get(page.id);
    if (permissions) result.set(page.id, permissions);
  }

  return result;
};
