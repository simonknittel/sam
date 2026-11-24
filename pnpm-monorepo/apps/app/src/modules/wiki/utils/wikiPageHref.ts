import type { EventContainer } from "@/modules/events/utils/eventContainer";
import {
  createBriefingWikiHrefBase,
  createVariantWikiHrefBase,
  getBriefingPath,
  getEventContainerOfRow,
  GLOBAL_WIKI_BASE_PATH,
  GLOBAL_WIKI_HREF_BASE,
  WikiScopeKind,
} from "@sam-monorepo/domain";

/**
 * The wiki UI serves three homes: the global wiki app, the briefing wikis of
 * events and event templates, and the wiki subtrees embedded on fleet
 * variant pages. Shared components derive page URLs and the active page from
 * this mode instead of hardcoding the global paths.
 */
export interface WikiPageHrefMode {
  readonly scope: WikiScopeKind;
  /**
   * The owning event or template in the Briefing scope, so client components
   * can scope their queries (tags, search, page targets) without a parallel
   * prop; null for the other scopes
   */
  readonly container: EventContainer | null;
  /**
   * The embedding variant in the Variant scope, the query-scoping key like
   * `container` above; null for the other scopes
   */
  readonly variantId: string | null;
  readonly basePath: string;
  /**
   * Page served at the "home" of the scope: the event wiki's locked root
   * page and the variant embed's linked page double as their homepages.
   * NULL for the global wiki, whose landing page is a static route, not a
   * page.
   */
  readonly rootPageId: string | null;
  /**
   * Where the root page serves when that differs from the basePath: the
   * variant embed's root renders on the plain variant URL while its
   * subpages live under the `/wiki` suffix. NULL means the basePath.
   */
  readonly rootHref: string | null;
}

export const GLOBAL_WIKI_HREF_MODE: WikiPageHrefMode = {
  scope: WikiScopeKind.Wiki,
  container: null,
  variantId: null,
  ...GLOBAL_WIKI_HREF_BASE,
};

export const createEventWikiHrefMode = (
  container: EventContainer,
  rootPageId: string | null,
): WikiPageHrefMode => ({
  scope: WikiScopeKind.Briefing,
  container,
  variantId: null,
  ...createBriefingWikiHrefBase(container, rootPageId),
});

export const createVariantWikiHrefMode = (
  variantId: string,
  rootPageId: string,
): WikiPageHrefMode => ({
  scope: WikiScopeKind.Variant,
  container: null,
  variantId,
  ...createVariantWikiHrefBase(variantId, rootPageId),
});

/** Takes a `WikiPageHrefMode`; the MCP server shares the rule */
export { buildWikiPageHref } from "@sam-monorepo/wiki-editor/helpers";

/**
 * Non-page routes under the base path (tags, trash, ...) yield their first
 * segment, which never matches a page id.
 */
export const getActiveWikiPageId = (
  mode: WikiPageHrefMode,
  pathname: string,
) => {
  if (mode.rootHref !== null && pathname === mode.rootHref)
    return mode.rootPageId ?? undefined;
  if (pathname === mode.basePath) return mode.rootPageId ?? undefined;
  if (!pathname.startsWith(`${mode.basePath}/`)) return undefined;
  return pathname.slice(mode.basePath.length + 1).split("/")[0];
};

/**
 * Tag list page a tag chip or search result links to. Variant embeds have
 * no tag routes of their own — tags are global in the WIKI namespace, so
 * they link out to the global wiki.
 */
export const buildWikiTagHref = (mode: WikiPageHrefMode, tagId: string) => {
  switch (mode.scope) {
    case WikiScopeKind.Wiki:
    case WikiScopeKind.Variant:
      return `${GLOBAL_WIKI_BASE_PATH}/tags/${tagId}`;

    case WikiScopeKind.Briefing:
      return `${mode.basePath}/tags/${tagId}`;

    default:
      throw new Error(`Unknown wiki scope: ${mode.scope satisfies never}`);
  }
};

/**
 * Always basePath-based, also for the root page: its snapshots never live
 * on the scope's home path, so the rootHref collapse of buildWikiPageHref
 * must not apply here.
 */
export const buildWikiPageSnapshotsHref = (
  mode: WikiPageHrefMode,
  pageId: string,
) => `${mode.basePath}/${pageId}/snapshots`;

/**
 * Route of a page identified only by its row, without a loaded context. A
 * briefing root page's id-URL redirects to the bare briefing path, so no root
 * lookup is needed. Pages of a variant subtree are ordinary global wiki pages,
 * so their cross-scope home deliberately stays `/app/wiki`.
 */
export const getWikiPageRouteHref = (page: {
  readonly id: string;
  readonly slug: string;
  readonly eventId: string | null;
  readonly templateId: string | null;
}) => {
  const container = getEventContainerOfRow(page);

  return container
    ? `${getBriefingPath(container)}/${page.id}/${page.slug}`
    : `${GLOBAL_WIKI_BASE_PATH}/${page.id}/${page.slug}`;
};
