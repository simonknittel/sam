import { requireAuthenticationPage } from "@/modules/auth/server";
import { SystemLogFilters } from "@/modules/audit/components/SystemLogFilters";
import { SystemLogTable } from "@/modules/audit/components/SystemLogTable";
import { getAuditEventCreators } from "@/modules/audit/queries/getAuditEventCreators";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Log",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/system-log">) {
  const authentication = await requireAuthenticationPage("/app/system-log");
  await authentication.authorizePage("systemLog", "read");

  const creators = await getAuditEventCreators();

  return (
    <SidebarLayout sidebar={<SystemLogFilters creators={creators} />}>
      <SuspenseWithErrorBoundaryTile>
        <SystemLogTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
