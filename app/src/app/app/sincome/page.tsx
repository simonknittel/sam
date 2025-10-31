import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import diagramSvg from "@/modules/profit-distribution/assets/diagram.svg";
import { ProfitDistributionCycleExcerptList } from "@/modules/profit-distribution/components/ProfitDistributionCycleExcerptList";
import { ProfitDistributionCycleSidebar } from "@/modules/profit-distribution/components/ProfitDistributionCycleSidebar";
import Image from "next/image";

export default async function Page({
  searchParams,
}: PageProps<"/app/sincome">) {
  const authentication = await requireAuthenticationPage("/app/sincome");
  await authentication.authorizePage("profitDistributionCycle", "read");

  return (
    <>
      <Image
        src={diagramSvg}
        unoptimized
        alt=""
        className="mx-auto mt-4 mb-8"
      />

      <SidebarLayout sidebar={<ProfitDistributionCycleSidebar />}>
        <h1 className="sr-only">SINcome</h1>

        <SuspenseWithErrorBoundaryTile>
          <ProfitDistributionCycleExcerptList searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </SidebarLayout>
    </>
  );
}
