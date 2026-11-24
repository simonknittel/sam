/**
 * Each key gets a page picker in the wiki settings. Add a member here to make
 * another link configurable.
 */
export enum WikiPageLinkKey {
  Support = "support",
}

export const getWikiPageLinkSettingKey = (key: WikiPageLinkKey) =>
  `pageLink:${key}`;

/**
 * The pages highlighted on the wiki landing page: four rows of its
 * three-column card grid
 */
export const MAXIMUM_WIKI_FEATURED_PAGES = 12;

/** An entry of the iframe allowlist */
export const WIKI_HOSTNAME_PATTERN =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
