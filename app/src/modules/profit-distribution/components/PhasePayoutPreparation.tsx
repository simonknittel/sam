"use client";

import type { getProfitDistributionCycleById } from "../queries";
import { CyclePhase } from "../utils/getCurrentPhase";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhasePayoutPreparation = ({ cycleData }: Props) => {
  return (
    <Phase
      phase={CyclePhase.PayoutPreparation}
      currentPhase={cycleData.currentPhase}
    >
      <h2 className="font-bold text-center font-mono uppercase">
        Vorbereitung der Auszahlung
      </h2>

      <div className="border-t border-white/5 mt-4 pt-8 pb-4">
        <p className="text-center text-sm flex flex-col justify-center">
          Die Auszahlung wird durch Economics vorbereitet. Bitte schaue später
          nochmal vorbei.
        </p>
      </div>
    </Phase>
  );
};
