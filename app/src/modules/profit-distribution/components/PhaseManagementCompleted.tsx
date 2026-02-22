"use client";

import { StatisticTile } from "@/modules/common/components/StatisticTile";
import type { getProfitDistributionCycleById } from "../queries";
import { CyclePhase } from "../utils/getCurrentPhase";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseManagementCompleted = ({ cycleData }: Props) => {
  return (
    <Phase phase={CyclePhase.Completed} currentPhase={cycleData.currentPhase}>
      <h2 className="font-bold text-center font-mono uppercase">
        Auszahlung abgeschlossen
      </h2>

      <div className="flex gap-[2px] border-t border-white/5 mt-4 pt-4">
        <StatisticTile label="aUEC ausgezahlt" className="flex-1">
          {cycleData.paidAuec?.toLocaleString("de") ?? "-"}
        </StatisticTile>

        <StatisticTile label="aUEC nicht ausgezahlt" className="flex-1">
          {cycleData.openAuecPayout?.toLocaleString("de") ?? "-"}
        </StatisticTile>
      </div>
    </Phase>
  );
};
