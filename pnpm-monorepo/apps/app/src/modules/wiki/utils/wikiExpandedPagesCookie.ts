/**
 * Persists which sidebar tree pages are expanded. Read on the server so SSR
 * already renders the remembered state — a client-only store would render
 * everything collapsed first and flash on hydration.
 *
 * Purely cosmetic: the state only expands or collapses rows the viewer may
 * see anyway, so a tampered cookie can't widen access.
 *
 * The value has two modes so that expanding or collapsing the whole tree
 * stays a single byte no matter how large the wiki grows:
 *
 *   ""                  everything collapsed (also the default)
 *   "a1b2c3d4,e5f6g7h8" only these pages are expanded
 *   "*"                 everything expanded
 *   "*,a1b2c3d4"        everything expanded except these pages
 */
export const WIKI_EXPANDED_PAGES_COOKIE = "wiki_expanded_pages";

/** Only the wiki reads this cookie — no need to send it with every request */
export const WIKI_EXPANDED_PAGES_COOKIE_PATH = "/app/wiki";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const INVERTED_MARKER = "*";

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

export interface WikiExpansionState {
  /** Whether `keys` lists the collapsed pages instead of the expanded ones */
  readonly inverted: boolean;
  readonly keys: ReadonlySet<string>;
}

export const WIKI_ALL_COLLAPSED: WikiExpansionState = {
  inverted: false,
  keys: new Set(),
};

export const WIKI_ALL_EXPANDED: WikiExpansionState = {
  inverted: true,
  keys: new Set(),
};

export const getWikiPageKey = (pageId: string) =>
  pageId.slice(-PAGE_KEY_LENGTH);

export const parseWikiExpandedPagesCookie = (
  value: string | undefined,
): WikiExpansionState => {
  if (!value || value.length > MAX_COOKIE_VALUE_LENGTH)
    return WIKI_ALL_COLLAPSED;

  const entries = value.split(",");
  const inverted = entries[0] === INVERTED_MARKER;
  const start = inverted ? 1 : 0;

  const keys = new Set(
    entries
      .slice(start, start + MAX_PAGE_KEYS)
      .filter((entry) => PAGE_KEY_PATTERN.test(entry)),
  );

  if (!inverted && keys.size === 0) return WIKI_ALL_COLLAPSED;
  if (inverted && keys.size === 0) return WIKI_ALL_EXPANDED;
  return { inverted, keys };
};

export const serializeWikiExpandedPagesCookie = (state: WikiExpansionState) => {
  // Insertion order makes this drop the least recently changed pages
  const keys = [...state.keys].slice(-MAX_PAGE_KEYS);
  const value = (state.inverted ? [INVERTED_MARKER, ...keys] : keys).join(",");

  return `${WIKI_EXPANDED_PAGES_COOKIE}=${value}; path=${WIKI_EXPANDED_PAGES_COOKIE_PATH}; samesite=lax; max-age=${value ? ONE_YEAR_IN_SECONDS : 0};`;
};

export const isWikiPageExpanded = (state: WikiExpansionState, pageId: string) =>
  state.keys.has(getWikiPageKey(pageId)) !== state.inverted;

export const hasAnyWikiPageExpanded = (state: WikiExpansionState) =>
  state.inverted || state.keys.size > 0;

/**
 * All mutations return the given state unchanged when nothing moves. The
 * sidebar reapplies the active page's path on every server render, and only
 * a stable reference stops that from looping through its cookie effect.
 */
const withKeys = (
  state: WikiExpansionState,
  keys: Set<string>,
): WikiExpansionState =>
  keys.size === state.keys.size && [...keys].every((key) => state.keys.has(key))
    ? state
    : { inverted: state.inverted, keys };

export const setWikiPageExpansion = (
  state: WikiExpansionState,
  pageId: string,
  expanded: boolean,
): WikiExpansionState => {
  const key = getWikiPageKey(pageId);
  const keys = new Set(state.keys);

  // Re-adding a key moves it to the end, i.e. marks it as most recent
  keys.delete(key);
  if (expanded !== state.inverted) keys.add(key);

  return withKeys(state, keys);
};

export const expandWikiPages = (
  state: WikiExpansionState,
  pageIds: readonly string[],
): WikiExpansionState => {
  const keys = new Set(state.keys);

  for (const pageId of pageIds) {
    const key = getWikiPageKey(pageId);
    if (state.inverted) keys.delete(key);
    else keys.add(key);
  }

  return withKeys(state, keys);
};
