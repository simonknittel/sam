import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { UploadsFilters } from "@/modules/uploads/components/UploadsFilters";
import { UploadsTable } from "@/modules/uploads/components/UploadsTable";
import { getUploadAuthors } from "@/modules/uploads/queries/getUploadAuthors";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uploads",
};

/**
 * Deliberately no `authorizePage`: everyone may see their own uploads. The
 * `upload;manage` permission widens the scope inside the query instead of
 * gating the route (see getUploads).
 */
export default async function Page({
  searchParams,
}: PageProps<"/app/uploads">) {
  const authentication = await requireAuthenticationPage("/app/uploads");

  const canManage = await authentication.authorize("upload", "manage");
  const authors = canManage ? await getUploadAuthors() : [];

  return (
    <SidebarLayout sidebar={<UploadsFilters authors={authors} />}>
      <SuspenseWithErrorBoundaryTile>
        <UploadsTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
