import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Filters } from "@/modules/penalty-points/components/Filters";
import { FlatEntriesTable } from "@/modules/penalty-points/components/FlatEntriesTable";

export default async function Page({
  searchParams,
}: PageProps<"/app/penalty-points">) {
  const authentication = await requireAuthenticationPage("/app/penalty-points");
  await authentication.authorizePage("penaltyEntry", "read");

  return (
    <SidebarLayout sidebar={<Filters />}>
      <SuspenseWithErrorBoundaryTile>
        <FlatEntriesTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
