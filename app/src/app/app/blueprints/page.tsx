import { requireAuthenticationPage } from "@/modules/auth/server";
import { BlueprintsFilters } from "@/modules/blueprints/components/BlueprintsFilters";
import { BlueprintsTile } from "@/modules/blueprints/components/BlueprintsTile";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";

export default async function Page({
  searchParams,
}: PageProps<"/app/blueprints">) {
  const authentication = await requireAuthenticationPage("/app/blueprints");
  await authentication.authorizePage("blueprint", "read");

  return (
    <SidebarLayout sidebar={<BlueprintsFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <BlueprintsTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
