import { getRequestActor } from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { BundleLoader } from "@/modules/log-analyzer/components/BundleLoader";
import { LogAnalyzerGuide } from "@/modules/log-analyzer/components/LogAnalyzerGuide";
import { canUseRemoteControlProgram } from "@sam-monorepo/application";
import { forbidden } from "next/navigation";

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/tools/log-analyzer",
  );
  await authentication.authorizePage("logAnalyzer", "read");

  /**
   * The Log Analyzer is a control UI of the Remote Control Program, also for
   * the own log (decision 24 of `docs/remote-control-program/README.md`). The
   * check also refuses an admin who assumes the user.
   */
  if (!canUseRemoteControlProgram(await getRequestActor())) forbidden();

  const crashLogAnalyzer = await getUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer);

  return (
    <>
      {/* The guide is outside of the error boundary, thus it also shows
          while the Log Analyzer fails */}
      <LogAnalyzerGuide className="mb-4" />

      <SuspenseWithErrorBoundaryTile>
        <BundleLoader crashLogAnalyzer={crashLogAnalyzer} />
      </SuspenseWithErrorBoundaryTile>
    </>
  );
}
