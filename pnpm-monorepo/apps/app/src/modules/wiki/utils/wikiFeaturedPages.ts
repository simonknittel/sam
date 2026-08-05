/**
 * The pages highlighted on the wiki landing page, curated in the wiki
 * settings (see `WIKI_SETTING_FEATURED_PAGES`).
 *
 * This module must stay importable from client components (pure data, no
 * server-only imports).
 */

/** Fills four rows of the landing page's three-column card grid */
export const MAX_WIKI_FEATURED_PAGES = 12;

/**
 * The pages of the stored featured list, in the order the wiki admins
 * arranged them. Ids the viewer must not see anything of are skipped:
 * unknown pages, pages in the trash and pages the viewer cannot read. The
 * stored list keeps them until it is saved again, which then drops them for
 * good — no cleanup on page deletion needed.
 */
export const resolveWikiFeaturedPages = <
  T extends { id: string; deletedAt: Date | null },
>(
  pageIds: readonly string[],
  pagesById: ReadonlyMap<string, T>,
  canRead: (pageId: string) => boolean,
): T[] => {
  const result: T[] = [];
  const seen = new Set<string>();

  for (const pageId of pageIds) {
    if (seen.has(pageId)) continue;
    seen.add(pageId);

    const page = pagesById.get(pageId);
    if (!page || page.deletedAt || !canRead(pageId)) continue;

    result.push(page);
  }

  return result;
};
