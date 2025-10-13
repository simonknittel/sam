import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ActivityTile } from "@/modules/spynet/components/ActivityTile/ActivityTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktivität - Spynet",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/activity",
  );
  await authentication.authorizePage("spynetActivity", "read");

  return (
    <MaxWidthContent>
      <SuspenseWithErrorBoundaryTile>
        <ActivityTile />
      </SuspenseWithErrorBoundaryTile>
    </MaxWidthContent>
  );
}
