import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { SilcBalancesTable } from "@/modules/silc/components/SilcBalancesTable";
import { SilcStatistics } from "@/modules/silc/components/SilcStatistics";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "SILC",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/silc/dashboard");
  await authentication.authorizePage("silcBalanceOfOtherCitizen", "read");

  return (
    <div className="flex flex-col gap-[2px]">
      <SuspenseWithErrorBoundaryTile>
        <SilcStatistics />
      </SuspenseWithErrorBoundaryTile>

      <SuspenseWithErrorBoundaryTile>
        <SilcBalancesTable />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
