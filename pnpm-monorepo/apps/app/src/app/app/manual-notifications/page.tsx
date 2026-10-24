import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ManualNotificationsFilters } from "@/modules/manual-notifications/components/ManualNotificationsFilters";
import { ManualNotificationsTable } from "@/modules/manual-notifications/components/ManualNotificationsTable";
export default async function Page({
  searchParams,
}: PageProps<"/app/manual-notifications">) {
  const authentication = await requireAuthenticationPage(
    "/app/manual-notifications",
  );
  await authentication.authorizePage("manualNotification", "manage");

  return (
    <SidebarLayout sidebar={<ManualNotificationsFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <ManualNotificationsTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
