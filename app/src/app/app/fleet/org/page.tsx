import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { OrgFleetFilters } from "@/modules/fleet/components/OrgFleetFilters";
import { OrgFleetTile } from "@/modules/fleet/components/OrgFleetTile";
import { getOrgFleetVariantTags } from "@/modules/fleet/queries";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Organisation",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/fleet/org">) {
  const authentication = await requireAuthenticationPage("/app/fleet/org");
  await authentication.authorizePage("orgFleet", "read");

  const variantTags = await getOrgFleetVariantTags();

  return (
    <SidebarLayout sidebar={<OrgFleetFilters variantTags={variantTags} />}>
      <SuspenseWithErrorBoundaryTile>
        <OrgFleetTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
