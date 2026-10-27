import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { RoleTagsFilters } from "@/modules/roles/components/tags/RoleTagsFilters";
import { RoleTagsTable } from "@/modules/roles/components/tags/RoleTagsTable";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/iam/tags">) {
  const authentication = await requireAuthenticationPage("/app/iam/tags");
  await authentication.authorizePage("role", "manage");

  return (
    <MaxWidthContent>
      <SidebarLayout sidebar={<RoleTagsFilters />}>
        <SuspenseWithErrorBoundaryTile>
          <RoleTagsTable searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
