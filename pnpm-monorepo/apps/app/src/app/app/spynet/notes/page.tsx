import { requireAuthenticationPage } from "@/modules/auth/server";
import { NotesTableFilters } from "@/modules/citizen/components/NotesTableFilters";
import { NotesTableTile } from "@/modules/citizen/components/NotesTableTile";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Notizen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/spynet/notes">) {
  const authentication = await requireAuthenticationPage("/app/spynet/notes");
  await Promise.all([
    authentication.authorizePage("citizen", "read"),
    authentication.authorizePage("spynetNotes", "read"),
  ]);

  return (
    <MaxWidthContent>
      <SidebarLayout sidebar={<NotesTableFilters />}>
        <SuspenseWithErrorBoundaryTile>
          <NotesTableTile searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </MaxWidthContent>
  );
}
