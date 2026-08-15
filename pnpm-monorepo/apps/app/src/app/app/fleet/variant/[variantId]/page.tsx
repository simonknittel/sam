import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { VariantDetailFrame } from "@/modules/fleet/components/VariantDetailFrame";
import { getVariantDetail } from "@/modules/fleet/queries/variantDetail";
import { VariantWikiPageContent } from "@/modules/wiki/components/VariantWikiPageContent";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/app/fleet/variant/[variantId]">): Promise<Metadata> {
  const variant = await getVariantDetail((await params).variantId);
  if (!variant) notFound();

  return {
    title: variant.name,
  };
}

export default async function Page({
  params,
  searchParams,
}: PageProps<"/app/fleet/variant/[variantId]">) {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/variant/[variantId]",
  );

  const hasShipManage = await authentication.authorize("ship", "manage");
  const hasOrgFleetRead = await authentication.authorize("orgFleet", "read");

  if (!hasShipManage && !hasOrgFleetRead) {
    await authentication.authorizePage("ship", "manage");
  }

  const variantId = (await params).variantId;
  const variant = await getVariantDetail(variantId);
  if (!variant) notFound();

  /**
   * The linked wiki page renders as the embed's start page right here;
   * without a readable embed the section simply stays away (decision:
   * never a placeholder, existence never leaks).
   */
  const wikiContext = await getVariantWikiContext(variantId);

  return (
    <VariantDetailFrame
      variant={variant}
      searchParams={searchParams}
      wikiContent={
        wikiContext ? (
          <SuspenseWithErrorBoundaryTile>
            <VariantWikiPageContent
              variantId={variantId}
              pageId={wikiContext.rootPage.id}
            />
          </SuspenseWithErrorBoundaryTile>
        ) : undefined
      }
    />
  );
}
