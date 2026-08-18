import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { SpynetActivityFilters } from "@/modules/spynet/components/SpynetActivityFilters";
import { SpynetActivityTable } from "@/modules/spynet/components/SpynetActivityTable";
import { getSpynetActivityActors } from "@/modules/spynet/queries/getSpynetActivityActors";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktivität",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/spynet/activity">) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/activity",
  );
  await authentication.authorizePage("spynetActivity", "read");

  const actors = await getSpynetActivityActors();

  return (
    <MaxWidthContent>
      <SidebarLayout sidebar={<SpynetActivityFilters actors={actors} />}>
        <SuspenseWithErrorBoundaryTile>
          <SpynetActivityTable searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
