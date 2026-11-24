import { CreateWikiPageProvider } from "@/modules/wiki/components/CreateWikiPageProvider";
import { WikiPageHrefModeProvider } from "@/modules/wiki/components/WikiPageHrefModeProvider";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";

/**
 * Unlike the briefing layout, no 404 without a context: the plain variant page
 * works without an embedded wiki, and the wiki subroutes give the 404.
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
      <CreateWikiPageProvider allowTopLevel={false}>
        {children}
      </CreateWikiPageProvider>
    </WikiPageHrefModeProvider>
  );
}
