import { cookies } from "next/headers";
import { getVariantWikiContext } from "../queries/getVariantWikiContext";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { buildVisibleWikiTree } from "../utils/buildVisibleWikiTree";
import { filterWikiPagesBySidebarMode } from "../utils/filterWikiPagesBySidebarMode";
import { VARIANT_WIKI_EXPANDED_PAGES_COOKIE } from "../utils/wikiExpandedPagesCookie";
import { buildWikiPageHref } from "../utils/wikiPageHref";
import { VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE } from "../utils/wikiShowHiddenPagesCookie";
import { WikiSearch } from "./WikiSearch";
import { WikiSidebarFavorites } from "./WikiSidebarFavorites";
import { WikiSidebarTree } from "./WikiSidebarTree";

interface Props {
  readonly variantId: string;
}

/**
 * The embedded wiki's sidebar on a variant page: search, favourites and the
 * page tree, all limited to the linked subtree. Rendered inside the variant
 * layout's WikiPageHrefModeProvider, which points the shared tree
 * components at the embed routes. No trash link — deleted pages land in the
 * global wiki's trash (the pages live there).
 */
export const VariantWikiSidebar = async ({ variantId }: Props) => {
  const context = await getVariantWikiContext(variantId);
  if (!context) return null;

  const favoriteIds = await getWikiFavoritePageIds();
  const favorites = context.pages
    .filter(
      (page) =>
        favoriteIds.has(page.id) && context.permissions.get(page.id)?.canRead,
    )
    .toSorted((a, b) => a.title.localeCompare(b.title))
    .map((page) => ({
      id: page.id,
      title: page.title,
      iconId: page.iconId,
      href: buildWikiPageHref(context.hrefMode, page),
    }));

  const filteredPages = filterWikiPagesBySidebarMode(context.pages);
  const filteredPageIds = new Set(filteredPages.map((page) => page.id));
  const tree = buildVisibleWikiTree(filteredPages, context.permissions);
  const fullTree = buildVisibleWikiTree(context.pages, context.permissions);
  /** Readable pages the sidebar mode hides — revealable via the tree's toggle */
  const sidebarHiddenPageIds = context.pages
    .filter(
      (page) =>
        !filteredPageIds.has(page.id) &&
        context.permissions.get(page.id)?.canRead,
    )
    .map((page) => page.id);

  const cookieStore = await cookies();
  const showHidden =
    cookieStore.get(VARIANT_WIKI_SHOW_HIDDEN_PAGES_COOKIE)?.value === "1";
  const expandedPages = cookieStore.get(
    VARIANT_WIKI_EXPANDED_PAGES_COOKIE,
  )?.value;

  return (
    <>
      <div className="bg-secondary p-4 corners-secondary flex flex-col gap-4">
        <WikiSearch compact />
      </div>

      <div className="bg-secondary px-2 py-4 corners-secondary flex flex-col gap-4">
        <WikiSidebarFavorites pages={favorites} />
      </div>

      <div className="bg-secondary px-2 py-4 corners-secondary flex flex-col gap-4">
        <WikiSidebarTree
          tree={tree}
          fullTree={fullTree}
          hiddenPageIds={sidebarHiddenPageIds}
          initialShowHidden={showHidden}
          expandedPagesCookie={expandedPages}
        />
      </div>
    </>
  );
};
