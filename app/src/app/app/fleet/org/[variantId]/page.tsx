import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { OrgFleetFilters } from "@/modules/fleet/components/OrgFleetFilters";
import { VariantShipsTile } from "@/modules/fleet/components/VariantShipsTile";
import {
  getVariantById,
  getVariantShipsVariantTags,
} from "@/modules/fleet/queries";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/app/fleet/org/[variantId]">): Promise<Metadata> {
  const variant = await getVariantById((await params).variantId);
  if (!variant) notFound();

  return {
    title: `${variant.name} - Flotte`,
  };
}

export default async function Page({
  params,
  searchParams,
}: PageProps<"/app/fleet/org/[variantId]">) {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/org/[variantId]",
  );
  await authentication.authorizePage("otherShips", "read");

  const variantId = (await params).variantId;
  const variant = await getVariantById(variantId);
  if (!variant) notFound();

  const variantTags = await getVariantShipsVariantTags();

  return (
    <SidebarLayout sidebar={<OrgFleetFilters variantTags={variantTags} />}>
      <SuspenseWithErrorBoundaryTile>
        <VariantShipsTile variantId={variantId} searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
