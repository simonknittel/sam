import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiReportsFilters } from "@/modules/wiki/components/WikiReportsFilters";
import { WikiReportsTable } from "@/modules/wiki/components/WikiReportsTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meldungen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/wiki/reports">) {
  const authentication = await requireAuthenticationPage("/app/wiki/reports");
  await authentication.authorizePage("wiki", "manage");

  return (
    <SidebarLayout sidebar={<WikiReportsFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <WikiReportsTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
