"use client";

import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { CyclePhase } from "@sam-monorepo/domain";
import type { getProfitDistributionCycleById } from "../queries/getProfitDistributionCycleById";
import { CitizenTable } from "./CitizenTable";
import { EndCollectionPhaseButton } from "./EndCollectionPhaseButton";
import { Phase } from "./Phase";
import { PhaseEndDate } from "./PhaseEndDate";

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
      <h2 className="text-center font-mono font-bold uppercase">Sammelphase</h2>

      <div className="mt-4 flex gap-0.5 border-t border-white/5 pt-4">
        <StatisticTile label="Anzahl Teilnehmer bisher" className="flex-1">
          <ScrambleIn
            text={
              cycleData.currentPhase === CyclePhase.Collection
                ? cycleData.allSilcBalances.length.toLocaleString("de")
                : cycleData.cycle.participants.length.toLocaleString("de")
            }
            characters="1234567890."
          />
        </StatisticTile>

        <StatisticTile label="Gesamt verdiente SILC bisher" className="flex-1">
          <ScrambleIn
            text={
              cycleData.currentPhase === CyclePhase.Collection
                ? cycleData.allSilcBalances
                    .reduce((total, citizen) => total + citizen.silcBalance, 0)
                    .toLocaleString("de")
                : cycleData.cycle.participants
                    .reduce(
                      (total, participant) =>
                        total + (participant.silcBalanceSnapshot || 0),
                      0,
                    )
                    .toLocaleString("de")
            }
            characters="1234567890."
          />
        </StatisticTile>
      </div>

      <div className="mt-4 flex justify-center">
        <PhaseEndDate
          plannedEnd={cycleData.cycle.collectionEndsAt}
          actualEnd={cycleData.cycle.collectionEndedAt}
        />
        {/* TODO: Implement edit button */}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <p className="text-center text-sm">
          Du kannst diese Phase sofort beenden.
        </p>

        <EndCollectionPhaseButton cycleData={cycleData} />
      </div>

      {cycleData.currentPhase === CyclePhase.Collection && (
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/5 pt-4">
          <CitizenTable cycleData={cycleData} />
        </div>
      )}
    </Phase>
  );
};
