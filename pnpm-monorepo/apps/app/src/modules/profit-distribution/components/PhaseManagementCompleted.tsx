"use client";

import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { CyclePhase } from "@sam-monorepo/domain";
import type { getProfitDistributionCycleById } from "../queries/getProfitDistributionCycleById";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseManagementCompleted = ({ cycleData }: Props) => {
  return (
    <Phase phase={CyclePhase.Completed} currentPhase={cycleData.currentPhase}>
      <h2 className="text-center font-mono font-bold uppercase">
        Auszahlung abgeschlossen
      </h2>

      <div className="mt-4 flex gap-[2px] border-t border-white/5 pt-4">
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
