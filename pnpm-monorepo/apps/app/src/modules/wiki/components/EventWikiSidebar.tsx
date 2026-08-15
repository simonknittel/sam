import { Link } from "@/modules/common/components/Link";
import { FaTrash } from "react-icons/fa";
import { getEventWikiContext } from "../queries/getEventWikiContext";
import { createEventWikiHrefMode } from "../utils/wikiPageHref";
import { WikiSidebarPanels } from "./WikiSidebarPanels";

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

  return (
    <WikiSidebarPanels
      pages={context.pages}
      permissions={context.permissions}
      hrefMode={hrefMode}
      footer={
        context.viewer.isEventManager && (
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
        )
      }
    />
  );
};
