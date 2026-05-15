import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ShipChangesFilters } from "@/modules/fleet/components/ShipChangesFilters";
import { ShipChangesTile } from "@/modules/fleet/components/ShipChangesTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Änderungen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/fleet/changes">) {
  const authentication = await requireAuthenticationPage("/app/fleet/changes");
  await authentication.authorizePage("otherShips", "read");

  return (
    <SidebarLayout sidebar={<ShipChangesFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <ShipChangesTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
