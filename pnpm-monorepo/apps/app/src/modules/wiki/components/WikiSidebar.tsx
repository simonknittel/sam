import { Link } from "@/modules/common/components/Link";
import { cookies } from "next/headers";
import { FaStar } from "react-icons/fa";
import {
  getWikiContext,
  type WikiContextPage,
} from "../queries/getWikiContext";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { buildVisibleWikiTree } from "../utils/buildVisibleWikiTree";
import { filterWikiPagesBySidebarMode } from "../utils/filterWikiPagesBySidebarMode";
import { WIKI_EXPANDED_PAGES_COOKIE } from "../utils/wikiExpandedPagesCookie";
import { WIKI_SHOW_HIDDEN_PAGES_COOKIE } from "../utils/wikiShowHiddenPagesCookie";
import { WikiPageIcon } from "./WikiPageIcon";
import { WikiSearch } from "./WikiSearch";
import { WikiSidebarTree } from "./WikiSidebarTree";

export const WikiSidebar = async () => {
  const context = await getWikiContext();
  if (!context) return null;

  const favoriteIds = await getWikiFavoritePageIds();
  const favorites = context.pages
    .filter(
      (page) =>
        favoriteIds.has(page.id) && context.permissions.get(page.id)?.canRead,
    )
    .toSorted((a, b) => a.title.localeCompare(b.title));

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
    cookieStore.get(WIKI_SHOW_HIDDEN_PAGES_COOKIE)?.value === "1";
  const expandedPages = cookieStore.get(WIKI_EXPANDED_PAGES_COOKIE)?.value;

  return (
    <>
      <div className="bg-secondary p-4 corners-secondary flex flex-col gap-4">
        <WikiSearch compact />
      </div>

      <div className="bg-secondary px-2 py-4 corners-secondary flex flex-col gap-4">
        <Favorites pages={favorites} />
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

interface FavoritesProps {
  readonly pages: WikiContextPage[];
}

const Favorites = ({ pages }: FavoritesProps) => {
  return (
    <div>
      <p className="px-2 text-sm text-white/40 font-mono uppercase">
        Favoriten
      </p>

      {pages.length > 0 ? (
        <ul className="mt-1 flex flex-col">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/app/wiki/${page.id}/${page.slug}`}
                // See the tree's links: prefetching a page prefetches the
                // sidebar it renders along with it
                prefetch={false}
                className="flex items-center gap-2 rounded-secondary px-2 py-1 text-neutral-300 hover:text-interaction-300"
                title={page.title}
              >
                {page.iconId ? (
                  <WikiPageIcon iconId={page.iconId} />
                ) : (
                  <FaStar className="size-3 flex-none text-amber-400" />
                )}
                <span className="truncate">{page.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-white/20 px-2 mt-1 italic">
          Du hast bisher keine Favoriten.
        </p>
      )}
    </div>
  );
};
