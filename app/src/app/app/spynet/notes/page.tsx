import { requireAuthenticationPage } from "@/modules/auth/server";
import { NotesTableTile } from "@/modules/citizen/components/NotesTableTile";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { searchParamsNextjsToURLSearchParams } from "@/modules/common/utils/searchParamsNextjsToURLSearchParams";
import { type Metadata } from "next";

export const revalidate = 0; // TODO: Revert to 60

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

  const urlSearchParams =
    await searchParamsNextjsToURLSearchParams(searchParams);

  return (
    <div className="overflow-x-hidden">
      <SuspenseWithErrorBoundaryTile>
        <NotesTableTile searchParams={urlSearchParams} />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
