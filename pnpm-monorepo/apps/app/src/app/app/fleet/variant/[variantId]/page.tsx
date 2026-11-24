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
  await requireAuthenticationPage("/app/fleet/variant/[variantId]");

  const variantId = (await params).variantId;
  /** Without access to the variant pages, the read answers with a 403 */
  const variant = await getVariantDetail(variantId);
  if (!variant) notFound();

  /** No placeholder without a readable embed: its existence must not leak */
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
