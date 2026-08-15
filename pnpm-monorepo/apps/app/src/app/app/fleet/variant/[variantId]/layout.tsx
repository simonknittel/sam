import { CreateWikiPageProvider } from "@/modules/wiki/components/CreateWikiPageProvider";
import { WikiPageHrefModeProvider } from "@/modules/wiki/components/WikiPageHrefModeProvider";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { getManageableWikiPageTargets } from "@/modules/wiki/utils/getWikiPageTargets";

/**
 * Mounts the embedded wiki's providers around the variant detail routes:
 * the href mode pointing the shared wiki components at the embed routes,
 * and the create-page modal with targets limited to the linked subtree.
 * Unlike the briefing layout this must NOT 404 on a missing context — the
 * plain variant page works without an embedded wiki; the wiki subroutes
 * 404 themselves.
 */
export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/fleet/variant/[variantId]">) {
  const { variantId } = await params;
  const context = await getVariantWikiContext(variantId);
  if (!context) return children;

  return (
    <WikiPageHrefModeProvider mode={context.hrefMode}>
      <CreateWikiPageProvider
        targets={getManageableWikiPageTargets(
          context,
          undefined,
          context.rootPage.id,
        )}
        allowTopLevel={false}
      >
        {children}
      </CreateWikiPageProvider>
    </WikiPageHrefModeProvider>
  );
}
