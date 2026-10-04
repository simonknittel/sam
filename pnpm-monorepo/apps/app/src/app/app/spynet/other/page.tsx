import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";
import OtherTableTile from "../../../../modules/citizen/components/OtherTableTile";

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
    <div className="overflow-x-hidden">
      <SuspenseWithErrorBoundaryTile>
        <OtherTableTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
