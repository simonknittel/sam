export interface WikiPageLinkedPage {
  title: string;
  slug: string;
  /**
   * Absolute URL of the page's icon, if it has one. Resolved by the app so
   * this package needs no knowledge of the upload storage.
   */
  iconSrc?: string;
  /**
   * Route of the page, resolved by the app. Event wiki pages live under
   * their event, not under the global wiki route this node falls back to.
   */
  href?: string;
}

export interface ResolvedWikiPageLink {
  pageId: string;
  title: string;
  href: string;
  iconSrc: string | null;
}

/**
 * Pages the current viewer can see, by id. An entry of null marks a page
 * that the app looked up for this viewer but that is invisible or deleted.
 */
export type WikiLinkedPages = Readonly<
  Record<string, WikiPageLinkedPage | null>
>;

/**
 * Resolves an internal page link's label and route from its attributes and
 * the pages map. Null for pages that are null in or missing from the map
 * (invisible or deleted), which render as an unavailable placeholder
 * without leaking their title.
 */
export const resolveWikiPageLink = (
  pages: WikiLinkedPages,
  attributes: Readonly<Record<string, unknown>>,
): ResolvedWikiPageLink | null => {
  const pageId = typeof attributes.pageId === "string" ? attributes.pageId : "";
  // The id is document content — keys like "constructor" must not resolve
  const page = Object.hasOwn(pages, pageId) ? pages[pageId] : null;
  if (!pageId || !page) return null;

  return {
    pageId,
    title: page.title,
    href:
      page.href ??
      `/app/wiki/${encodeURIComponent(pageId)}/${encodeURIComponent(page.slug)}`,
    iconSrc: page.iconSrc ?? null,
  };
};
