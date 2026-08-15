import { getWikiContext } from "../queries/getWikiContext";
import { GLOBAL_WIKI_HREF_MODE } from "../utils/wikiPageHref";
import { WikiSidebarPanels } from "./WikiSidebarPanels";

export const WikiSidebar = async () => {
  const context = await getWikiContext();
  if (!context) return null;

  return (
    <WikiSidebarPanels
      pages={context.pages}
      permissions={context.permissions}
      hrefMode={GLOBAL_WIKI_HREF_MODE}
    />
  );
};
