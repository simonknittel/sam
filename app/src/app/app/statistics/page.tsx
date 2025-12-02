import { requireAuthenticationPage } from "@/modules/auth/server";
import Note from "@/modules/common/components/Note";
import { StatisticSection } from "@/modules/statistics/components/StatisticSection";
import {
  getRoleCitizenStatisticChart,
  getVariantShipStatisticChart,
} from "@/modules/statistics/queries";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistiken",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/statistics");
  await authentication.authorizePage("globalStatistics", "read");

  const [roleChart, variantChart] = await Promise.all([
    getRoleCitizenStatisticChart(),
    getVariantShipStatisticChart(),
  ]);

  return (
    <>
      <p className="text-right text-neutral-500 text-sm">
        <strong>Zeitraum:</strong> 03.12.2025 - jetzt
      </p>

      <div className="flex flex-wrap gap-4 mt-4">
        <StatisticSection
          title="Flotte"
          description="Tägliche Aufzeichnung der Schiffe pro Variante."
          chart={variantChart}
          className="flex-1"
        />

        <StatisticSection
          title="Rollen"
          description="Tägliche Aufzeichnung der Citizen pro Rolle."
          chart={roleChart}
          className="flex-1"
        />
      </div>

      <Note
        type="warning"
        message="Diese Darstellung der Statistiken kann nicht die Rollen des aktuellen Benutzers berücksichtigen. Daher werden bspw. die Berechtigungen für die Sichtbarkeit von Rollen hier ausgehebelt."
        className="mt-4"
      />
    </>
  );
}
