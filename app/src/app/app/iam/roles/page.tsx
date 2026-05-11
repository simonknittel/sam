import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { RolesFilters } from "@/modules/roles/components/RolesFilters";
import { RolesTile } from "@/modules/roles/components/RolesTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Rollen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/iam/roles">) {
  const authentication = await requireAuthenticationPage("/app/iam/roles");
  await authentication.authorizePage("role", "manage");

  return (
    <MaxWidthContent>
      <SidebarLayout sidebar={<RolesFilters />}>
        <SuspenseWithErrorBoundaryTile>
          <RolesTile searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
