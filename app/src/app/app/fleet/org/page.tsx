import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { OrgFleetFilters } from "@/modules/fleet/components/OrgFleetFilters";
import { OrgFleetTile } from "@/modules/fleet/components/OrgFleetTile";
import { getManufacturers } from "@/modules/fleet/queries/getManufacturers";
import { getOrgFleetVariantTags } from "@/modules/fleet/queries/getOrgFleetVariantTags";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Organisation",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/fleet/org">) {
  const authentication = await requireAuthenticationPage("/app/fleet/org");
  await authentication.authorizePage("orgFleet", "read");

  const [variantTags, manufacturers] = await Promise.all([
    getOrgFleetVariantTags(),
    getManufacturers(),
  ]);

  return (
    <SidebarLayout
      sidebar={
        <OrgFleetFilters
          variantTags={variantTags}
          manufacturers={manufacturers}
        />
      }
    >
      <SuspenseWithErrorBoundaryTile>
        <OrgFleetTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
