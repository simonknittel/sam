import { requireAuthenticationPage } from "@/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/common/components/SuspenseWithErrorBoundaryTile";
import { ActivityTile } from "@/spynet/components/ActivityTile/ActivityTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktivität - Spynet | S.A.M. - Sinister Incorporated",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/activity",
  );
  await authentication.authorizePage("spynetActivity", "read");

  return (
    <SuspenseWithErrorBoundaryTile>
      <ActivityTile />
    </SuspenseWithErrorBoundaryTile>
  );
}
