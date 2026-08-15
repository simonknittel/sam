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

/** One shared cookie for all variant embeds, like the expanded-pages one */
export const VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE =
  "variant_wiki_show_hidden_pages";

const VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH = "/app/fleet/variant";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const getWikiShowHiddenPagesCookieNameAndPath = (scope: WikiScope) => {
  switch (scope) {
    case WikiScope.Wiki:
      return [
        WIKI_SHOW_HIDDEN_PAGES_COOKIE,
        WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH,
      ] as const;

    case WikiScope.Event:
      return [
        EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE,
        EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH,
      ] as const;

    case WikiScope.Variant:
      return [
        VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE,
        VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH,
      ] as const;

    default:
      throw new Error(`Unknown wiki scope: ${scope satisfies never}`);
  }
};

export const getWikiShowHiddenPagesCookieName = (scope: WikiScope) =>
  getWikiShowHiddenPagesCookieNameAndPath(scope)[0];

export const serializeWikiShowHiddenPagesCookie = (
  showHidden: boolean,
  scope: WikiScope,
) => {
  const [name, path] = getWikiShowHiddenPagesCookieNameAndPath(scope);

  return showHidden
    ? `${name}=1; path=${path}; samesite=lax; max-age=${ONE_YEAR_IN_SECONDS};`
    : `${name}=; path=${path}; samesite=lax; max-age=0;`;
};
