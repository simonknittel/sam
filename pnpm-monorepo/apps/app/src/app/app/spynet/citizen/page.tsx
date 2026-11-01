import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenTableFilters } from "@/modules/citizen/components/CitizenTableFilters";
import { CitizenTableTile } from "@/modules/citizen/components/CitizenTableTile";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Citizen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/spynet/citizen">) {
  const authentication = await requireAuthenticationPage("/app/spynet/citizen");
  await Promise.all([
    authentication.authorizePage("citizen", "read"),
    authentication.authorizePage("spynetCitizen", "read"),
  ]);

  return (
    <MaxWidthContent>
      <SidebarLayout sidebar={<CitizenTableFilters />}>
        <SuspenseWithErrorBoundaryTile>
          <CitizenTableTile searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
