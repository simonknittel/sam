import { Link } from "@/modules/common/components/Link";
import type { EventContainer } from "@/modules/events/utils/eventContainer";
import { FaTrash } from "react-icons/fa";
import { getEventWikiContext } from "../queries/getEventWikiContext";
import { createEventWikiHrefMode } from "../utils/wikiPageHref";
import { WikiSidebarPanels } from "./WikiSidebarPanels";

interface Props {
  readonly container: EventContainer;
}

/**
 * The briefing sidebar: favourites and the page tree, limited to this
 * container's pages. Rendered inside the briefing layout's
 * WikiPageHrefModeProvider, which points the shared tree components at the
 * container's routes.
 */
export const EventWikiSidebar = async ({ container }: Props) => {
  const context = await getEventWikiContext(container);
  if (!context?.rootPage) return null;

  const hrefMode = createEventWikiHrefMode(container, context.rootPage.id);

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
