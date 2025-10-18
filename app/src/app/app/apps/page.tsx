import { AppsOverview } from "@/modules/apps/components/AppsOverview";
import { getAppLinks } from "@/modules/apps/utils/queries";
import { requireAuthenticationPage } from "@/modules/auth/server";

export const revalidate = 86400; // 24 hours

export default async function Page() {
  await requireAuthenticationPage("/app/apps");

  const appApps = await getAppLinks();

  return <AppsOverview allApps={appApps} />;
}
