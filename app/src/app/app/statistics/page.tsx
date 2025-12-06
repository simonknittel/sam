import { requireAuthenticationPage } from "@/modules/auth/server";
import Note from "@/modules/common/components/Note";
import { formatDate } from "@/modules/common/utils/formatDate";
import { StatisticSection } from "@/modules/statistics/components/StatisticSection";
import {
  getDailyLoginStatisticChart,
  getDailySilcStatisticChart,
  getEventsPerDayStatisticChart,
  getRoleCitizenStatisticChart,
  getTotalShipStatisticChart,
  getVariantShipStatisticChart,
} from "@/modules/statistics/queries";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistiken",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/statistics");
  await authentication.authorizePage("globalStatistics", "read");

  const [
    roleChart,
    variantChart,
    totalShipsChart,
    loginChart,
    eventsChart,
    silcChart,
  ] = await Promise.all([
    getRoleCitizenStatisticChart(),
    getVariantShipStatisticChart(),
    getTotalShipStatisticChart(),
    getDailyLoginStatisticChart(),
    getEventsPerDayStatisticChart(),
    getDailySilcStatisticChart(),
  ]);

  return (
    <>
      <p className="text-right text-neutral-500 text-sm">
        <strong>Zeitraum:</strong>{" "}
        {formatDate(roleChart.dateRange.from, "short")} - jetzt
      </p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatisticSection
          title="Flotte gesamt"
          description="Gesamtanzahl eingetragener Schiffe"
          chart={totalShipsChart}
          className="flex-1"
        />

        <StatisticSection
          title="Flotte"
          description="Anzahl eingetragener Schiffe pro Variante"
          chart={variantChart}
          className="flex-1"
        />

        <StatisticSection
          title="Rollen"
          description="Anzahl Citizens pro Rolle"
          chart={roleChart}
          className="flex-1"
        />

        <StatisticSection
          title="Logins"
          description="Anzahl unique Logins pro Tag"
          chart={loginChart}
          className="flex-1"
        />

        <StatisticSection
          title="Events"
          description="Anzahl Events pro Tag"
          chart={eventsChart}
          className="flex-1"
        />

        <StatisticSection
          title="SILC"
          description="Neu generierte SILC-Menge pro Tag"
          chart={silcChart}
          className="flex-1"
        />
      </div>

      <Note
        type="info"
        message="Diese Darstellung der Statistiken kann nicht die Rollen des aktuellen Benutzers berücksichtigen. Daher werden bspw. die Berechtigungen für die Sichtbarkeit von Rollen hier ausgehebelt."
        className="mt-4"
      />
    </>
  );
}
