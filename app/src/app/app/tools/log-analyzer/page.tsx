import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { BundleLoader } from "@/modules/log-analyzer/components/BundleLoader";

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/tools/log-analyzer",
  );
  await authentication.authorizePage("logAnalyzer", "read");

  const crashLogAnalyzer = await getUnleashFlag(UNLEASH_FLAG.CrashLogAnalyzer);

  return (
    <SuspenseWithErrorBoundaryTile>
      <BundleLoader crashLogAnalyzer={crashLogAnalyzer} />
    </SuspenseWithErrorBoundaryTile>
  );
}
