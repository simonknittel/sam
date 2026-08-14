import { WikiScope } from "./wikiPageHref";

/**
 * Persists which sidebar tree pages are expanded. Read on the server so SSR
 * already renders the remembered state — a client-only store would render
 * everything collapsed first and flash on hydration.
 *
 * Purely cosmetic: the state only expands or collapses rows the viewer may
 * see anyway, so a tampered cookie can't widen access.
 *
 * The value lists the expanded pages, nothing else:
 *
 *   ""                  everything collapsed (also the default)
 *   "a1b2c3d4,e5f6g7h8" only these pages are expanded
 */
export const WIKI_EXPANDED_PAGES_COOKIE = "wiki_expanded_pages";

/** Only the wiki reads this cookie — no need to send it with every request */
const WIKI_EXPANDED_PAGES_COOKIE_PATH = "/app/wiki";

/**
 * One shared cookie for all event wikis: the page keys below are id-based
 * and therefore unique across events, and sharing the budget keeps the
 * cookie jar small.
 */
export const EVENT_WIKI_EXPANDED_PAGES_COOKIE = "event_wiki_expanded_pages";

const EVENT_WIKI_EXPANDED_PAGES_COOKIE_PATH = "/app/events";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Pages are identified by the last characters of their 24 character cuid2
 * instead of the full id, which triples how many fit into the 4 KB a cookie
 * may hold. Eight characters span ~2.8e12 values, so even a five digit page
 * count collides with a probability far below one in a million — and a
 * collision merely expands one row that should have stayed collapsed.
 */
const PAGE_KEY_LENGTH = 8;

const PAGE_KEY_PATTERN = /^[0-9a-z]{8}$/;

/**
 * Keeps the serialized value well below the 4 KB a browser stores per cookie.
 * Exceeding it would make the browser drop the cookie entirely, losing the
 * whole state instead of a few entries.
 */
const MAX_PAGE_KEYS = 350;

/**
 * More than a browser stores per cookie, so such a value never came from us
 * and is not worth splitting. Values merely above `MAX_PAGE_KEYS` are still
 * parsed, just truncated.
 */
const MAX_COOKIE_VALUE_LENGTH = 4096;

/** Keys of the expanded pages, in the order they were expanded */
export type WikiExpansionState = ReadonlySet<string>;

export const WIKI_ALL_COLLAPSED: WikiExpansionState = new Set();

const getWikiPageKey = (pageId: string) =>
  pageId.slice(-PAGE_KEY_LENGTH);

export const parseWikiExpandedPagesCookie = (
  value: string | undefined,
): WikiExpansionState => {
  if (!value || value.length > MAX_COOKIE_VALUE_LENGTH)
    return WIKI_ALL_COLLAPSED;

  const keys = new Set(
    value
      .split(",")
      .slice(0, MAX_PAGE_KEYS)
      .filter((entry) => PAGE_KEY_PATTERN.test(entry)),
  );

  return keys.size > 0 ? keys : WIKI_ALL_COLLAPSED;
};

export const serializeWikiExpandedPagesCookie = (
  state: WikiExpansionState,
  scope: WikiScope,
) => {
  // Insertion order makes this drop the least recently expanded pages
  const value = [...state].slice(-MAX_PAGE_KEYS).join(",");

  const [name, path] =
    scope === WikiScope.Event
      ? [
          EVENT_WIKI_EXPANDED_PAGES_COOKIE,
          EVENT_WIKI_EXPANDED_PAGES_COOKIE_PATH,
        ]
      : [WIKI_EXPANDED_PAGES_COOKIE, WIKI_EXPANDED_PAGES_COOKIE_PATH];

  return `${name}=${value}; path=${path}; samesite=lax; max-age=${value ? ONE_YEAR_IN_SECONDS : 0};`;
};

export const isWikiPageExpanded = (state: WikiExpansionState, pageId: string) =>
  state.has(getWikiPageKey(pageId));

/**
 * All mutations return the given state unchanged when nothing moves. The
 * sidebar reapplies the active page's path on every render, and only a stable
 * reference stops that from looping through its cookie effect.
 */
const withKeys = (
  state: WikiExpansionState,
  keys: Set<string>,
): WikiExpansionState =>
  keys.size === state.size && [...keys].every((key) => state.has(key))
    ? state
    : keys;

export const setWikiPageExpansion = (
  state: WikiExpansionState,
  pageId: string,
  expanded: boolean,
): WikiExpansionState => {
  const key = getWikiPageKey(pageId);
  const keys = new Set(state);

  // Re-adding a key moves it to the end, i.e. marks it as most recent
  keys.delete(key);
  if (expanded) keys.add(key);

  return withKeys(state, keys);
};

export const expandWikiPages = (
  state: WikiExpansionState,
  pageIds: readonly string[],
): WikiExpansionState => {
  const keys = new Set(state);
  for (const pageId of pageIds) keys.add(getWikiPageKey(pageId));

  return withKeys(state, keys);
};
