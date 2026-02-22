"use client";

import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { getProfitDistributionCycleById } from "../queries";
import { CyclePhase } from "../utils/getCurrentPhase";
import { CitizenTable } from "./CitizenTable";
import { EndCollectionPhaseButton } from "./EndCollectionPhaseButton";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseManagementCollection = ({ cycleData }: Props) => {
  return (
    <Phase
      phase={CyclePhase.Collection}
      currentPhase={cycleData.currentPhase}
      innerClassName="overflow-hidden"
    >
      <h2 className="text-center font-bold font-mono uppercase">Sammelphase</h2>

      <div className="flex gap-[2px] border-t border-white/5 mt-4 pt-4">
        <StatisticTile label="Anzahl Teilnehmer bisher" className="flex-1">
          {cycleData.currentPhase === CyclePhase.Collection
            ? cycleData.allSilcBalances.length.toLocaleString("de")
            : cycleData.cycle.participants.length.toLocaleString("de")}
        </StatisticTile>

        <StatisticTile label="Gesamt verdiente SILC bisher" className="flex-1">
          {cycleData.currentPhase === CyclePhase.Collection
            ? cycleData.allSilcBalances
                .reduce((total, citizen) => total + citizen.silcBalance, 0)
                .toLocaleString("de")
            : cycleData.cycle.participants
                .reduce(
                  (total, participant) =>
                    total + (participant.silcBalanceSnapshot || 0),
                  0,
                )
                .toLocaleString("de")}
        </StatisticTile>
      </div>

      <div className="flex justify-center mt-4">
        <div className="flex flex-col justify-center items-center text-sm">
          <h3 className="text-neutral-500">Endet am</h3>

          <p>{formatDate(cycleData.cycle.collectionEndedAt, "short")}</p>

          {/* TODO: Implement edit button */}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2 mt-2">
        <p className="text-center text-sm">
          Du kannst diese Phase sofort beenden.
        </p>

        <EndCollectionPhaseButton cycleData={cycleData} />
      </div>

      {cycleData.currentPhase === CyclePhase.Collection && (
        <div className="flex justify-center items-center gap-2 border-t border-white/5 pt-4 mt-4">
          <CitizenTable cycleData={cycleData} />
        </div>
      )}
    </Phase>
  );
};
