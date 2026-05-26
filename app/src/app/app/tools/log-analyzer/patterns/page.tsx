import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { CreateLogAnalyzerPatternButton } from "@/modules/log-analyzer/components/CreateLogAnalyzerPatternButton";
import { LogAnalyzerPatternsFilters } from "@/modules/log-analyzer/components/LogAnalyzerPatternsFilters";
import { LogAnalyzerPatternsTable } from "@/modules/log-analyzer/components/LogAnalyzerPatternsTable";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Muster",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/tools/log-analyzer/patterns">) {
  const authentication = await requireAuthenticationPage(
    "/app/log-analyzer/patterns",
  );
  await authentication.authorizePage("logAnalyzerPattern", "manage");

  return (
    <SidebarLayout
      sidebar={<LogAnalyzerPatternsFilters />}
      childrenContainerClassName="flex flex-col gap-4"
    >
      <div className="flex justify-end">
        <CreateLogAnalyzerPatternButton />
      </div>

      <SuspenseWithErrorBoundaryTile>
        <LogAnalyzerPatternsTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
