import { WikiPageSidebarMode } from "@sam-monorepo/database/client";

interface SidebarModePage {
  readonly id: string;
  readonly parentId: string | null;
  readonly sidebarMode: WikiPageSidebarMode;
}

/**
 * Removes pages from the sidebar tree input based on their sidebar mode:
 * HIDDEN pages disappear together with their whole subtree, CHILDREN_HIDDEN
 * pages stay visible themselves but their whole subtree disappears.
 *
 * Membership in a sidebar-hidden subtree wins over the flatten-up rule of
 * `buildVisibleWikiTree` — permission-visible descendants are deliberately
 * NOT flattened under a visible ancestor, so "dataset" subtrees stay out of
 * the sidebar entirely. The ancestor walk therefore ignores read
 * permissions on purpose.
 *
 * Purely cosmetic: only the sidebar applies this filter. Search, favorites,
 * recents, tag pages and page-index nodes ignore it.
 */
export const filterWikiPagesBySidebarMode = <T extends SidebarModePage>(
  pages: readonly T[],
): T[] => {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const excluded = new Map<string, boolean>();

  const isExcluded = (page: SidebarModePage, seen: Set<string>): boolean => {
    const cached = excluded.get(page.id);
    if (cached !== undefined) return cached;
    // Broken parent cycles keep their pages visible, matching how
    // `buildVisibleWikiTree` attaches such pages to the root.
    if (seen.has(page.id)) return false;
    seen.add(page.id);

    let result: boolean;
    if (page.sidebarMode === WikiPageSidebarMode.HIDDEN) {
      result = true;
    } else {
      const parent = page.parentId ? pagesById.get(page.parentId) : undefined;
      result =
        parent !== undefined &&
        (parent.sidebarMode === WikiPageSidebarMode.CHILDREN_HIDDEN ||
          isExcluded(parent, seen));
    }

    excluded.set(page.id, result);
    return result;
  };

  return pages.filter((page) => !isExcluded(page, new Set()));
};
