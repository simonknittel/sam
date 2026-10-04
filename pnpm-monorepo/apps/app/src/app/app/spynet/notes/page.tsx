import { requireAuthenticationPage } from "@/modules/auth/server";
import { NotesTableTile } from "@/modules/citizen/components/NotesTableTile";
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
    <div className="overflow-x-hidden">
      <SuspenseWithErrorBoundaryTile>
        <NotesTableTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
