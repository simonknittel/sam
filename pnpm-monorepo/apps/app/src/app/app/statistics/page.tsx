import { requireAuthenticationPage } from "@/modules/auth/server";
import { StatisticsDashboard } from "@/modules/statistics/components/StatisticsDashboard";
import { resolveStatisticsDashboard } from "@/modules/statistics/utils/resolveStatisticsDashboard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistiken",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/statistics");
  await authentication.authorizePage("globalStatistics", "read");

  return (
    <StatisticsDashboard
      dashboard={await resolveStatisticsDashboard(authentication.session)}
    />
  );
}
