import { WikiScope } from "./wikiPageHref";

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
const WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH = "/app/wiki";

/** One shared cookie for all event wikis, like the expanded-pages one */
export const EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE =
  "event_wiki_show_hidden_pages";

const EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH = "/app/events";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const serializeWikiShowHiddenPagesCookie = (
  showHidden: boolean,
  scope: WikiScope,
) => {
  const [name, path] =
    scope === WikiScope.Event
      ? [
          EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE,
          EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH,
        ]
      : [WIKI_SHOW_HIDDEN_PAGES_COOKIE, WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH];

  return showHidden
    ? `${name}=1; path=${path}; samesite=lax; max-age=${ONE_YEAR_IN_SECONDS};`
    : `${name}=; path=${path}; samesite=lax; max-age=0;`;
};
