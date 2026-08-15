import { getVariantWikiContext } from "../queries/getVariantWikiContext";
import { WikiSidebarPanels } from "./WikiSidebarPanels";

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

  return (
    <WikiSidebarPanels
      pages={context.pages}
      permissions={context.permissions}
      hrefMode={context.hrefMode}
    />
  );
};
