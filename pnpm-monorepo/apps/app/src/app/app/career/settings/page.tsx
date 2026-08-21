import { requireAuthenticationPage } from "@/modules/auth/server";
import { FlowsFilters } from "@/modules/career/components/FlowsFilters";
import { FlowsTable } from "@/modules/career/components/FlowsTable";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/career/settings">) {
  const authentication = await requireAuthenticationPage(
    "/app/career/settings",
  );
  await authentication.authorizePage("career", "manage");

  return (
    <SidebarLayout sidebar={<FlowsFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <FlowsTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
