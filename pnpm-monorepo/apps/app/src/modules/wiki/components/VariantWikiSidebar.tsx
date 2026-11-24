import { getVariantWikiContext } from "../queries/getVariantWikiContext";
import { WikiSidebarPanels } from "./WikiSidebarPanels";

interface Props {
  readonly variantId: string;
}

/**
 * No trash link — deleted pages land in the global wiki's trash (the pages
 * live there)
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
