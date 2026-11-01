import { requireAuthenticationPage } from "@/modules/auth/server";
import { OtherFilters } from "@/modules/citizen/components/OtherFilters";
import { OtherTableTile } from "@/modules/citizen/components/OtherTableTile";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sonstige",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/spynet/other">) {
  const authentication = await requireAuthenticationPage("/app/spynet/other");
  await Promise.all([
    authentication.authorizePage("citizen", "read"),
    authentication.authorizePage("spynetOther", "read"),
  ]);

  return (
    <MaxWidthContent>
      <SidebarLayout sidebar={<OtherFilters />}>
        <SuspenseWithErrorBoundaryTile>
          <OtherTableTile searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
