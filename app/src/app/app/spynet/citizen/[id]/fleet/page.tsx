import { requireAuthenticationPage } from "@/modules/auth/server";
import { getCitizenById } from "@/modules/citizen/queries";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { CitizenFleetTile } from "@/modules/fleet/components/CitizenFleetTile";
import { MyFleetFilters } from "@/modules/fleet/components/MyFleetFilters";
import { getCitizenFleetVariantTags } from "@/modules/fleet/queries";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Flotte",
};

type Params = Promise<
  Readonly<{
    id: string;
  }>
>;

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

  const variantTags = await getCitizenFleetVariantTags(citizenId);

  return (
    <SidebarLayout sidebar={<MyFleetFilters variantTags={variantTags} />}>
      <SuspenseWithErrorBoundaryTile>
        <CitizenFleetTile citizenId={citizenId} searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
