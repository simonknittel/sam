import { Link } from "@/modules/common/components/Link";
import { cookies } from "next/headers";
import { FaTrash } from "react-icons/fa";
import { getEventWikiContext } from "../queries/getEventWikiContext";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { buildVisibleWikiTree } from "../utils/buildVisibleWikiTree";
import { filterWikiPagesBySidebarMode } from "../utils/filterWikiPagesBySidebarMode";
import { EVENT_WIKI_EXPANDED_PAGES_COOKIE } from "../utils/wikiExpandedPagesCookie";
import {
  buildWikiPageHref,
  createEventWikiHrefMode,
} from "../utils/wikiPageHref";
import { EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE } from "../utils/wikiShowHiddenPagesCookie";
import { WikiSidebarFavorites } from "./WikiSidebarFavorites";
import { WikiSidebarTree } from "./WikiSidebarTree";

interface Props {
  readonly eventId: string;
}

/**
 * The briefing sidebar: favourites and the page tree, limited to this
 * event's pages. Rendered inside the briefing layout's
 * WikiPageHrefModeProvider, which points the shared tree components at the
 * event routes.
 */
export const EventWikiSidebar = async ({ eventId }: Props) => {
  const context = await getEventWikiContext(eventId);
  if (!context?.rootPage) return null;

  const hrefMode = createEventWikiHrefMode(eventId, context.rootPage.id);

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
      href: buildWikiPageHref(hrefMode, page),
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
    cookieStore.get(EVENT_WIKI_SHOW_HIDDEN_PAGES_COOKIE)?.value === "1";
  const expandedPages = cookieStore.get(
    EVENT_WIKI_EXPANDED_PAGES_COOKIE,
  )?.value;

  return (
    <>
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

      {context.viewer.isEventManager && (
        <div className="bg-secondary px-2 py-2 corners-secondary">
          <Link
            href={`${hrefMode.basePath}/trash`}
            prefetch={false}
            className="flex items-center gap-2 rounded-secondary px-2 py-1 text-neutral-300 hover:text-interaction-300"
          >
            <FaTrash className="size-3 flex-none text-neutral-500" />
            Papierkorb
          </Link>
        </div>
      )}
    </>
  );
};
