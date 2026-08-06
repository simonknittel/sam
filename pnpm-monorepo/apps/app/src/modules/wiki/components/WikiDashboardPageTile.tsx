import { Link } from "@/modules/common/components/Link";
import { isWikiPageContentEmpty } from "@sam-monorepo/wiki-editor";
import clsx from "clsx";
import { FaChevronDown } from "react-icons/fa";
import { getWikiContext } from "../queries/getWikiContext";
import { getWikiPageStaticContent } from "../queries/getWikiPageStaticContent";
import { getWikiDashboardPageId } from "../queries/getWikiSettings";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
import "./wikiDashboardPageTile.css";
import { WikiPageStaticContent } from "./WikiPageStaticContent";

/**
 * Roughly a screenful — longer pages scroll inside the panel instead of
 * pushing the rest of the dashboard down. Whether the content overflows
 * cannot be known while rendering on the server, so nothing about the
 * panel's layout depends on it (see wikiDashboardPageTile.css).
 */
const MAX_CONTENT_HEIGHT = "max-h-[30rem] sm:max-h-[40rem]";

/**
 * Read-only render of the wiki page the wiki admins put on the dashboard
 * (see `WIKI_SETTING_DASHBOARD_PAGE`). Deliberately without any collab
 * connection, so the content can lag an ongoing editing session by the
 * collab server's persistence debounce.
 *
 * Renders nothing when no page is configured, the page is gone or the
 * viewer may not read it — all of which look the same, so neither the page
 * nor the setting leaks.
 */
export const WikiDashboardPageTile = async () => {
  const pageId = await getWikiDashboardPageId();
  // Short-circuits before the expensive permission resolution below
  if (!pageId) return null;

  const context = await getWikiContext();
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, "read");
  if (!page) return null;

  const staticContent = await getWikiPageStaticContent(context, page.id);
  if (!staticContent.content || isWikiPageContentEmpty(staticContent.content))
    return null;

  return (
    <section className="flex flex-col items-center gap-0.5">
      {/* The overflow keeps the indicator overlay inside the beveled corners */}
      <div
        className="relative w-full overflow-hidden bg-secondary corners-primary"
        data-wiki-dashboard-content=""
      >
        {/*
          Scroll chaining stays at the browser default: `overscroll-contain`
          would swallow the gesture even when the content fits or the end is
          already reached, leaving no way to scroll the dashboard on from here.
        */}
        <div
          className={clsx("overflow-y-auto p-4", MAX_CONTENT_HEIGHT)}
          data-wiki-dashboard-scroller=""
        >
          <WikiPageStaticContent pageId={page.id} {...staticContent} />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center pb-1 text-neutral-400"
          data-wiki-dashboard-scroll-indicator=""
        >
          {/* The chevron still points the way once the bounce is gone */}
          <FaChevronDown className="animate-bounce motion-reduce:animate-none" />
        </div>
      </div>

      <Link
        href={`/app/wiki/${page.id}/${page.slug}`}
        className="text-interaction-500 hover:underline focus-visible:underline font-mono uppercase text-sm mt-2"
      >
        Ganze Seite öffnen
      </Link>
    </section>
  );
};
