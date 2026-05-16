import { requireAuthenticationPage } from "@/modules/auth/server";
import { getCitizenById } from "@/modules/citizen/queries/getCitizenById";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { CitizenFleetTile } from "@/modules/fleet/components/CitizenFleetTile";
import { MyFleetFilters } from "@/modules/fleet/components/MyFleetFilters";
import { getCitizenFleetVariantTags } from "@/modules/fleet/queries/getCitizenFleetVariantTags";
import { getManufacturers } from "@/modules/fleet/queries/getManufacturers";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Flotte",
};

export default async function Page({
  params,
  searchParams,
}: PageProps<"/app/spynet/citizen/[id]/fleet">) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/citizen/[id]/fleet",
  );
  await authentication.authorizePage("otherShips", "read");

  const citizenId = (await params).id;
  const citizen = await getCitizenById(citizenId);
  if (!citizen) notFound();

  const [variantTags, manufacturers] = await Promise.all([
    getCitizenFleetVariantTags(citizenId),
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
        <CitizenFleetTile citizenId={citizenId} searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
