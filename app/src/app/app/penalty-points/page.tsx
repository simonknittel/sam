import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { AllEntriesTable } from "@/modules/penalty-points/components/AllEntriesTable";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Strafpunkte | S.A.M. - Sinister Incorporated",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/penalty-points");
  await authentication.authorizePage("penaltyEntry", "read");

  return (
    <MaxWidthContent>
      <SuspenseWithErrorBoundaryTile>
        <AllEntriesTable />
      </SuspenseWithErrorBoundaryTile>
    </MaxWidthContent>
  );
}
