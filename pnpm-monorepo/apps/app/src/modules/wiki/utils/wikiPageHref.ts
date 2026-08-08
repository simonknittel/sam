/**
 * The wiki UI serves two homes: the global wiki app and the event-scoped
 * briefing wikis. Shared components derive page URLs and the active page
 * from this mode instead of hardcoding the global paths.
 */
export enum WikiScope {
  Wiki = "wiki",
  Event = "event",
}

export interface WikiPageHrefMode {
  readonly scope: WikiScope;
  /**
   * The owning event in the Event scope, so client components can scope
   * their queries (tags, search, page targets) without a parallel prop;
   * null for the global wiki
   */
  readonly eventId: string | null;
  /** Route prefix all page URLs live under */
  readonly basePath: string;
  /**
   * Page served at the bare basePath: the event wiki's locked root page,
   * which doubles as its homepage. NULL for the global wiki, whose landing
   * page is a static route, not a page.
   */
  readonly rootPageId: string | null;
}

export const GLOBAL_WIKI_HREF_MODE: WikiPageHrefMode = {
  scope: WikiScope.Wiki,
  eventId: null,
  basePath: "/app/wiki",
  rootPageId: null,
};

export const getEventWikiBasePath = (eventId: string) =>
  `/app/events/${eventId}/briefing`;

export const createEventWikiHrefMode = (
  eventId: string,
  rootPageId: string | null,
): WikiPageHrefMode => ({
  scope: WikiScope.Event,
  eventId,
  basePath: getEventWikiBasePath(eventId),
  rootPageId,
});

export const buildWikiPageHref = (
  mode: WikiPageHrefMode,
  page: { readonly id: string; readonly slug: string },
) =>
  page.id === mode.rootPageId
    ? mode.basePath
    : `${mode.basePath}/${page.id}/${page.slug}`;

/**
 * Page id a pathname points at, e.g. for highlighting the active tree row.
 * Non-page routes under the base path (tags, trash, ...) yield their first
 * segment, which never matches a page id — same behavior the global wiki
 * always had.
 */
export const getActiveWikiPageId = (
  mode: WikiPageHrefMode,
  pathname: string,
) => {
  if (pathname === mode.basePath) return mode.rootPageId ?? undefined;
  if (!pathname.startsWith(`${mode.basePath}/`)) return undefined;
  return pathname.slice(mode.basePath.length + 1).split("/")[0];
};

/**
 * Route of a page identified only by its row, without a loaded context:
 * event pages live under their event, everything else under the global
 * wiki. An event root page's id-URL redirects to the bare briefing path,
 * so no root lookup is needed. Used by cross-scope surfaces like the
 * reports queue.
 */
export const getWikiPageRouteHref = (page: {
  readonly id: string;
  readonly slug: string;
  readonly eventId: string | null;
}) =>
  page.eventId
    ? `${getEventWikiBasePath(page.eventId)}/${page.id}/${page.slug}`
    : `/app/wiki/${page.id}/${page.slug}`;
