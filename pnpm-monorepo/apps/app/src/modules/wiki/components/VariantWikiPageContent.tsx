import {
  collectVisibleWikiPageAncestors,
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "@sam-monorepo/application";
import { getVariantWikiContext } from "../queries/getVariantWikiContext";
import { getWikiPageStaticContent } from "../queries/getWikiPageStaticContent";
import { WikiPageContent } from "./WikiPageContent";

interface Props {
  readonly variantId: string;
  readonly pageId: string;
}

/**
 * A subtree page rendered inside a variant embed: the shared role-model
 * page view with embed hrefs and embed-scoped static content. The move
 * dialog limits its targets to the subtree through the variant layout's
 * href mode. Renders nothing when the embed or the page is gone — the
 * calling routes 404 beforehand; this only covers races.
 */
export const VariantWikiPageContent = async ({ variantId, pageId }: Props) => {
  const context = await getVariantWikiContext(variantId);
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, WikiPageAccessTier.Read);
  if (!page) return null;
  const permissions = context.permissions.get(page.id);
  if (!permissions) return null;

  const staticContent = await getWikiPageStaticContent(context, page.id);

  return (
    <WikiPageContent
      context={context.globalContext}
      page={page}
      permissions={permissions}
      ancestors={collectVisibleWikiPageAncestors(context, page)}
      hrefMode={context.hrefMode}
      staticContent={staticContent}
    />
  );
};
