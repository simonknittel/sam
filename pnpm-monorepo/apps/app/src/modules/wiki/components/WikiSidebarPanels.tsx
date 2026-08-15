import type { WikiPageTierPermissions } from "@sam-monorepo/permissions";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { buildVisibleWikiTree } from "../utils/buildVisibleWikiTree";
import { filterWikiPagesBySidebarMode } from "../utils/filterWikiPagesBySidebarMode";
import { getWikiExpandedPagesCookieName } from "../utils/wikiExpandedPagesCookie";
import {
  buildWikiPageHref,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";
import { getWikiShowHiddenPagesCookieName } from "../utils/wikiShowHiddenPagesCookie";
import { WikiSearch } from "./WikiSearch";
import { WikiSidebarFavorites } from "./WikiSidebarFavorites";
import { WikiSidebarTree } from "./WikiSidebarTree";

interface Props {
  /** The scope's not-deleted pages — favourites are intersected with them */
  readonly pages: readonly WikiSharedContextPage[];
  readonly permissions: ReadonlyMap<string, WikiPageTierPermissions>;
  /** Determines the page links and which scope's cookies persist the state */
  readonly hrefMode: WikiPageHrefMode;
  /** Extra panel below the tree, e.g. the event wiki's trash link */
  readonly footer?: ReactNode;
}

/**
 * The search, favourites and page tree panels every wiki sidebar consists
 * of: the global wiki's, the event briefings' and the variant embeds' — the
 * scope only decides which pages, links and cookies feed them.
 */
export const WikiSidebarPanels = async ({
  pages,
  permissions,
  hrefMode,
  footer,
}: Props) => {
  const favoriteIds = await getWikiFavoritePageIds();
  const favorites = pages
    .filter(
      (page) => favoriteIds.has(page.id) && permissions.get(page.id)?.canRead,
    )
    .toSorted((a, b) => a.title.localeCompare(b.title))
    .map((page) => ({
      id: page.id,
      title: page.title,
      iconId: page.iconId,
      href: buildWikiPageHref(hrefMode, page),
    }));

  const filteredPages = filterWikiPagesBySidebarMode(pages);
  const filteredPageIds = new Set(filteredPages.map((page) => page.id));
  const tree = buildVisibleWikiTree(filteredPages, permissions);
  const fullTree = buildVisibleWikiTree(pages, permissions);
  /** Readable pages the sidebar mode hides — revealable via the tree's toggle */
  const sidebarHiddenPageIds = pages
    .filter(
      (page) =>
        !filteredPageIds.has(page.id) && permissions.get(page.id)?.canRead,
    )
    .map((page) => page.id);

  const cookieStore = await cookies();
  const showHidden =
    cookieStore.get(getWikiShowHiddenPagesCookieName(hrefMode.scope))?.value ===
    "1";
  const expandedPages = cookieStore.get(
    getWikiExpandedPagesCookieName(hrefMode.scope),
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

      {footer}
    </>
  );
};
