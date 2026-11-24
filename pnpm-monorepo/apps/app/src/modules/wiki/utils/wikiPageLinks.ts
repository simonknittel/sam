import { WikiPageLinkKey } from "@sam-monorepo/domain";

/**
 * The texts of the configurable page links (see `WikiPageLinkKey`). Each
 * entry gets a page picker in the wiki settings.
 *
 * This module must stay importable from client components (pure data, no
 * server-only imports).
 */
interface WikiPageLink {
  readonly label: string;
  /** Shown in the settings UI to explain where the link appears */
  readonly description: string;
}

export const WIKI_PAGE_LINKS: Record<WikiPageLinkKey, WikiPageLink> = {
  [WikiPageLinkKey.Support]: {
    label: "Support-Seite",
    description:
      "Fragezeichen-Symbol in der Kopfleiste, Support-Button im mobilen Menü und Support-Links in Fehlermeldungen.",
  },
};

const WIKI_PAGE_LINK_KEYS: ReadonlySet<string> = new Set(
  Object.values(WikiPageLinkKey),
);

export const isWikiPageLinkKey = (key: string): key is WikiPageLinkKey =>
  WIKI_PAGE_LINK_KEYS.has(key);

/**
 * Stable URL redirecting to the configured page (or `/app/wiki` when
 * unset) — for places that cannot resolve the setting server-side, like
 * client components. Server components should prefer
 * `getWikiPageLinkTarget` to link the page directly.
 */
export const wikiPageLinkHref = (key: WikiPageLinkKey) =>
  `/app/wiki/link/${key}`;
