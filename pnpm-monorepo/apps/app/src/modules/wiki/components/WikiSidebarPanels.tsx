import type { WikiPageTierPermissions } from "@sam-monorepo/domain";
import { buildVisibleWikiTree } from "@sam-monorepo/wiki-editor/helpers";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
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
  readonly pages: readonly WikiSharedContextPage[];
  readonly permissions: ReadonlyMap<string, WikiPageTierPermissions>;
  readonly hrefMode: WikiPageHrefMode;
  readonly footer?: ReactNode;
}

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

  const filteredPageIds = new Set(
    filterWikiPagesBySidebarMode(pages).map((page) => page.id),
  );
  const tree = buildVisibleWikiTree(pages, permissions);
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
      <div className="flex flex-col gap-4 corners-secondary bg-secondary p-4">
        <WikiSearch compact />
      </div>

      <div className="flex flex-col gap-4 corners-secondary bg-secondary px-2 py-4">
        <WikiSidebarFavorites pages={favorites} />
      </div>

      <div className="flex flex-col gap-4 corners-secondary bg-secondary px-2 py-4">
        <WikiSidebarTree
          tree={tree}
          hiddenPageIds={sidebarHiddenPageIds}
          initialShowHidden={showHidden}
          expandedPagesCookie={expandedPages}
        />
      </div>

      {footer}
    </>
  );
};
