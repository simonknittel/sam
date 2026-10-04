import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";
import { CitizenTableTile } from "../../../../modules/citizen/components/CitizenTableTile";

export const metadata: Metadata = {
  title: "Citizen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/spynet/citizen">) {
  const authentication = await requireAuthenticationPage("/app/spynet/citizen");
  await Promise.all([
    authentication.authorizePage("citizen", "read"),
    authentication.authorizePage("spynetCitizen", "read"),
  ]);

  return (
    <div className="overflow-x-hidden">
      <SuspenseWithErrorBoundaryTile>
        <CitizenTableTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
