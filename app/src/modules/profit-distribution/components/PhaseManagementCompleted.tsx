"use client";

import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
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
          <ScrambleIn
            text={cycleData.paidAuec?.toLocaleString("de") ?? "-"}
            characters="1234567890."
          />
        </StatisticTile>

        <StatisticTile label="aUEC nicht ausgezahlt" className="flex-1">
          <ScrambleIn
            text={cycleData.openAuecPayout?.toLocaleString("de") ?? "-"}
            characters="1234567890."
          />
        </StatisticTile>
      </div>
    </Phase>
  );
};
