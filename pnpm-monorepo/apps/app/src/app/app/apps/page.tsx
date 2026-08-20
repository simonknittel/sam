import { AppsOverview } from "@/modules/apps/components/AppsOverview";
import { getAppLinks } from "@/modules/apps/utils/queries/getAppLinks";
import { requireAuthenticationPage } from "@/modules/auth/server";

export default async function Page() {
  await requireAuthenticationPage("/app/apps");

  const appApps = await getAppLinks();

  return <AppsOverview allApps={appApps} />;
}
