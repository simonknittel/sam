import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ProfitDistributionCycleExcerptList } from "@/modules/profit-distribution/components/ProfitDistributionCycleExcerptList";
import { ProfitDistributionCycleSidebar } from "@/modules/profit-distribution/components/ProfitDistributionCycleSidebar";
import { SincomeGuide } from "@/modules/profit-distribution/components/SincomeGuide";

export default async function Page({
  searchParams,
}: PageProps<"/app/sincome">) {
  const authentication = await requireAuthenticationPage("/app/sincome");
  await authentication.authorizePage("profitDistributionCycle", "read");

  return (
    <>
      <h1 className="sr-only">SINcome</h1>

      <SincomeGuide className="mb-4" />

      <SidebarLayout sidebar={<ProfitDistributionCycleSidebar />}>
        <SuspenseWithErrorBoundaryTile>
          <ProfitDistributionCycleExcerptList searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </>
  );
}
