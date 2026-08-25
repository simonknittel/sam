import { requireAuthenticationPage } from "@/modules/auth/server";
import { UpcomingBirthdaysTile } from "@/modules/citizen/components/UpcomingBirthdaysTile";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Geburtstage",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/spynet/birthdays">) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/birthdays",
  );
  await authentication.authorizePage("citizen", "read");

  return (
    <MaxWidthContent>
      <SidebarLayout
        sidebar={<TextSearchFilter label="Citizen" placeholder="Handle..." />}
      >
        <SuspenseWithErrorBoundaryTile>
          <UpcomingBirthdaysTile searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
