import { WikiScopeKind } from "@sam-monorepo/domain";

/** Read on the server and purely cosmetic, see `WIKI_EXPANDED_PAGES_COOKIE` */
export const WIKI_SHOW_HIDDEN_PAGES_COOKIE = "wiki_show_hidden_pages";

const WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH = "/app/wiki";

export const EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE =
  "event_wiki_show_hidden_pages";

const EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH = "/app/events";

export const VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE =
  "variant_wiki_show_hidden_pages";

const VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH = "/app/fleet/variant";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const getWikiShowHiddenPagesCookieNameAndPath = (scope: WikiScopeKind) => {
  switch (scope) {
    case WikiScopeKind.Wiki:
      return [
        WIKI_SHOW_HIDDEN_PAGES_COOKIE,
        WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH,
      ] as const;

    case WikiScopeKind.Briefing:
      return [
        EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE,
        EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH,
      ] as const;

    case WikiScopeKind.Variant:
      return [
        VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE,
        VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE_PATH,
      ] as const;

    default:
      throw new Error(`Unknown wiki scope: ${scope satisfies never}`);
  }
};

export const getWikiShowHiddenPagesCookieName = (scope: WikiScopeKind) =>
  getWikiShowHiddenPagesCookieNameAndPath(scope)[0];

export const serializeWikiShowHiddenPagesCookie = (
  showHidden: boolean,
  scope: WikiScopeKind,
) => {
  const [name, path] = getWikiShowHiddenPagesCookieNameAndPath(scope);

  return showHidden
    ? `${name}=1; path=${path}; samesite=lax; max-age=${ONE_YEAR_IN_SECONDS};`
    : `${name}=; path=${path}; samesite=lax; max-age=0;`;
};
