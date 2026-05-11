import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { UsersFilters } from "@/modules/users/components/UsersFilters";
import { UsersTile } from "@/modules/users/components/UsersTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Benutzer",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/iam/users">) {
  const authentication = await requireAuthenticationPage("/app/users");
  await authentication.authorizePage("user", "read");

  return (
    <MaxWidthContent>
      <SidebarLayout sidebar={<UsersFilters />}>
        <SuspenseWithErrorBoundaryTile>
          <UsersTile searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
