import { getVariantWikiContext } from "../queries/getVariantWikiContext";
import { getVariantWikiPageStaticContent } from "../queries/getVariantWikiPageStaticContent";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
import { getManageableWikiPageTargets } from "../utils/getWikiPageTargets";
import { WikiPageContent } from "./WikiPageContent";

interface Props {
  readonly variantId: string;
  readonly pageId: string;
}

/**
 * A subtree page rendered inside a variant embed: the shared role-model
 * page view with embed hrefs, embed-scoped static content and move targets
 * limited to the subtree. Renders nothing when the embed or the page is
 * gone — the calling routes 404 beforehand; this only covers races.
 */
export const VariantWikiPageContent = async ({ variantId, pageId }: Props) => {
  const context = await getVariantWikiContext(variantId);
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, "read");
  if (!page) return null;
  const permissions = context.permissions.get(page.id);
  if (!permissions) return null;

  const staticContent = await getVariantWikiPageStaticContent(context, page.id);
  const moveTargets = getManageableWikiPageTargets(
    context,
    page.id,
    context.rootPage.id,
  );

  return (
    <WikiPageContent
      context={context.globalContext}
      page={page}
      permissions={permissions}
      hrefMode={context.hrefMode}
      staticContent={staticContent}
      moveTargets={moveTargets}
    />
  );
};
