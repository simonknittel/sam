import { SessionsFilters } from "@/modules/auth/components/SessionsFilters";
import { SessionsTable } from "@/modules/auth/components/SessionsTable";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sitzungen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/account/sessions">) {
  await requireAuthenticationPage("/app/account/sessions");

  return (
    <SidebarLayout sidebar={<SessionsFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <SessionsTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
