import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { BundleLoader } from "@/modules/log-analyzer/components/BundleLoader";
import { LogAnalyzerGuide } from "@/modules/log-analyzer/components/LogAnalyzerGuide";

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/tools/log-analyzer",
  );
  await authentication.authorizePage("logAnalyzer", "read");

  const [crashLogAnalyzer, disableLogAnalyzerSharing] = await Promise.all([
    getUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer),
    getUnleashFlag(UNLEASH_FLAG.DisableLogAnalyzerSharing),
  ]);

  return (
    <>
      {/* The guide is outside of the error boundary, thus it also shows
          while the Log Analyzer fails */}
      <LogAnalyzerGuide
        isSharingAvailable={!disableLogAnalyzerSharing}
        className="mb-4"
      />

      <SuspenseWithErrorBoundaryTile>
        <BundleLoader
          crashLogAnalyzer={crashLogAnalyzer}
          isSharingAvailable={!disableLogAnalyzerSharing}
        />
      </SuspenseWithErrorBoundaryTile>
    </>
  );
}
