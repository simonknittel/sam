"use client";

import { CyclePhase } from "@sam-monorepo/domain";
import type { getProfitDistributionCycleById } from "../queries/getProfitDistributionCycleById";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseCompleted = ({ cycleData }: Props) => {
  return (
    <Phase phase={CyclePhase.Completed} currentPhase={cycleData.currentPhase}>
      <p className="text-center text-sm flex flex-col justify-center h-full">
        Auszahlung abgeschlossen
      </p>
    </Phase>
  );
};
