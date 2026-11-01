import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { SilcBalancesFilters } from "@/modules/silc/components/SilcBalancesFilters";
import { SilcBalancesTable } from "@/modules/silc/components/SilcBalancesTable";
import { SilcStatistics } from "@/modules/silc/components/SilcStatistics";
import { type Metadata } from "next";
import { FaSortAmountDown } from "react-icons/fa";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/silc/dashboard">) {
  const authentication = await requireAuthenticationPage("/app/silc/dashboard");
  await authentication.authorizePage("silcBalanceOfOtherCitizen", "read");

  return (
    <SidebarLayout
      sidebar={<SilcBalancesFilters />}
      mobileToggleLabel="Sortierung"
      mobileToggleIcon={<FaSortAmountDown />}
    >
      <div className="flex flex-col gap-0.5">
        <SuspenseWithErrorBoundaryTile>
          <SilcStatistics />
        </SuspenseWithErrorBoundaryTile>

        <SuspenseWithErrorBoundaryTile>
          <SilcBalancesTable searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </div>
    </SidebarLayout>
  );
}
