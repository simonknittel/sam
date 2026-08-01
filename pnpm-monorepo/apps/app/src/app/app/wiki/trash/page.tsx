import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiTrashFilters } from "@/modules/wiki/components/WikiTrashFilters";
import { WikiTrashTable } from "@/modules/wiki/components/WikiTrashTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Papierkorb",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/wiki/trash">) {
  await requireAuthenticationPage("/app/wiki/trash");

  return (
    <SidebarLayout sidebar={<WikiTrashFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <WikiTrashTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
