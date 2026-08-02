/**
 * Persists the sidebar's "show sidebar-hidden pages" toggle. Read on the
 * server so SSR already renders the remembered state — a client-only store
 * would render the default first and flash on hydration.
 *
 * Purely cosmetic: the toggle only reveals pages the viewer may read anyway,
 * so a tampered cookie can't widen access.
 */
export const WIKI_SHOW_HIDDEN_PAGES_COOKIE = "wiki_show_hidden_pages";

/** Only the wiki reads this cookie — no need to send it with every request */
export const WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH = "/app/wiki";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const serializeWikiShowHiddenPagesCookie = (showHidden: boolean) =>
  showHidden
    ? `${WIKI_SHOW_HIDDEN_PAGES_COOKIE}=1; path=${WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH}; samesite=lax; max-age=${ONE_YEAR_IN_SECONDS};`
    : `${WIKI_SHOW_HIDDEN_PAGES_COOKIE}=; path=${WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH}; samesite=lax; max-age=0;`;
