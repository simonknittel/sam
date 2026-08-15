import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { VariantDetailFrame } from "@/modules/fleet/components/VariantDetailFrame";
import { getVariantDetail } from "@/modules/fleet/queries/variantDetail";
import { canViewVariantPages } from "@/modules/fleet/utils/canViewVariantPages";
import { VariantWikiPageContent } from "@/modules/wiki/components/VariantWikiPageContent";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import {
  getVariantWikiBasePath,
  getVariantWikiRootPath,
} from "@/modules/wiki/utils/wikiPageHref";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Params =
  PageProps<"/app/fleet/variant/[variantId]/wiki/[pageId]/[[...slug]]">["params"];

const getVisiblePage = async (params: Params) => {
  const { variantId, pageId } = await params;
  const context = await getVariantWikiContext(variantId);
  if (!context) return null;

  /** Out-of-subtree ids miss the sliced context — 404 like unknown ids */
  const page = getAccessibleWikiPage(context, pageId, "read");
  if (!page) return null;

  return { context, page };
};

export const generateMetadata = async (
  props: PageProps<"/app/fleet/variant/[variantId]/wiki/[pageId]/[[...slug]]">,
): Promise<Metadata> => {
  const result = await getVisiblePage(props.params);
  if (!result) return {};
  return { title: result.page.title };
};

export default async function Page(
  props: PageProps<"/app/fleet/variant/[variantId]/wiki/[pageId]/[[...slug]]">,
) {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/variant/[variantId]/wiki/[pageId]/[[...slug]]",
  );

  /** The same 403 behavior as the variant page this route extends */
  if (!(await canViewVariantPages(authentication))) {
    await authentication.authorizePage("ship", "manage");
  }

  const { variantId, slug } = await props.params;
  const variant = await getVariantDetail(variantId);
  if (!variant) notFound();

  const result = await getVisiblePage(props.params);
  /**
   * Invisible pages 404 instead of 403 to avoid leaking their existence —
   * an unlinked variant, a trashed root and an unreadable page all look
   * the same.
   */
  if (!result) notFound();
  const { context, page } = result;

  /** The root page's canonical URL is the plain variant page */
  if (page.id === context.rootPage.id)
    redirect(getVariantWikiRootPath(variantId));
  if (slug?.[0] !== page.slug)
    redirect(`${getVariantWikiBasePath(variantId)}/${page.id}/${page.slug}`);

  return (
    <VariantDetailFrame
      variant={variant}
      searchParams={props.searchParams}
      wikiContent={
        <SuspenseWithErrorBoundaryTile>
          <VariantWikiPageContent variantId={variantId} pageId={page.id} />
        </SuspenseWithErrorBoundaryTile>
      }
    />
  );
}
