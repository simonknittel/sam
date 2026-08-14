/**
 * Well-known places in the app that link to a configurable wiki page.
 * Each entry gets a page picker in the wiki settings; the picked page is
 * stored in `WikiSetting` under `wikiPageLinkSettingKey(key)`. Add an entry
 * here to make another link configurable.
 *
 * This module must stay importable from client components (pure data, no
 * server-only imports).
 */
interface WikiPageLink {
  readonly label: string;
  /** Shown in the settings UI to explain where the link appears */
  readonly description: string;
}

export const WIKI_PAGE_LINKS = {
  support: {
    label: "Support-Seite",
    description:
      "Fragezeichen-Symbol in der Kopfleiste, Support-Button im mobilen Menü und Support-Links in Fehlermeldungen.",
  },
} as const satisfies Record<string, WikiPageLink>;

export type WikiPageLinkKey = keyof typeof WIKI_PAGE_LINKS;

export const WIKI_PAGE_LINK_KEYS = Object.keys(WIKI_PAGE_LINKS) as [
  WikiPageLinkKey,
  ...WikiPageLinkKey[],
];

export const isWikiPageLinkKey = (key: string): key is WikiPageLinkKey =>
  key in WIKI_PAGE_LINKS;

/** `WikiSetting.key` storing the picked page id for this link */
export const wikiPageLinkSettingKey = (key: WikiPageLinkKey) =>
  `pageLink:${key}`;

/**
 * Stable URL redirecting to the configured page (or `/app/wiki` when
 * unset) — for places that cannot resolve the setting server-side, like
 * client components and i18n strings. Server components should prefer
 * `getWikiPageLinkTarget` to link the page directly.
 */
export const wikiPageLinkHref = (key: WikiPageLinkKey) =>
  `/app/wiki/link/${key}`;
