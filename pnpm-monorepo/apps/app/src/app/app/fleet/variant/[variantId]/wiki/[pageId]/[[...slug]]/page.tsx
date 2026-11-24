import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { VariantDetailFrame } from "@/modules/fleet/components/VariantDetailFrame";
import { getVariantDetail } from "@/modules/fleet/queries/variantDetail";
import { VariantWikiPageContent } from "@/modules/wiki/components/VariantWikiPageContent";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "@sam-monorepo/application";
import {
  getVariantWikiBasePath,
  getVariantWikiRootPath,
} from "@sam-monorepo/domain";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Params =
  PageProps<"/app/fleet/variant/[variantId]/wiki/[pageId]/[[...slug]]">["params"];

const getVisiblePage = async (params: Params) => {
  const { variantId, pageId } = await params;
  const context = await getVariantWikiContext(variantId);
  if (!context) return null;

  /** Out-of-subtree ids miss the sliced context — 404 like unknown ids */
  const page = getAccessibleWikiPage(context, pageId, WikiPageAccessTier.Read);
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
  await requireAuthenticationPage(
    "/app/fleet/variant/[variantId]/wiki/[pageId]/[[...slug]]",
  );

  const { variantId, slug } = await props.params;
  const variant = await getVariantDetail(variantId);
  if (!variant) notFound();

  const result = await getVisiblePage(props.params);
  if (!result) notFound();
  const { context, page } = result;

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
