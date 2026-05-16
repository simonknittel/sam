import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { MyFleetFilters } from "@/modules/fleet/components/MyFleetFilters";
import { MyFleetTile } from "@/modules/fleet/components/MyFleetTile";
import { getManufacturers } from "@/modules/fleet/queries/getManufacturers";
import { getMyFleetVariantTags } from "@/modules/fleet/queries/getMyFleetVariantTags";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Meine Schiffe",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/fleet/my-ships">) {
  const authentication = await requireAuthenticationPage("/app/fleet/my-ships");
  await authentication.authorizePage("ship", "manage");

  const [variantTags, manufacturers] = await Promise.all([
    getMyFleetVariantTags(),
    getManufacturers(),
  ]);

  return (
    <SidebarLayout
      sidebar={
        <MyFleetFilters
          variantTags={variantTags}
          manufacturers={manufacturers}
        />
      }
    >
      <SuspenseWithErrorBoundaryTile>
        <MyFleetTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
