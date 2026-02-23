"use client";

import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { getProfitDistributionCycleById } from "../queries";
import { CyclePhase } from "../utils/getCurrentPhase";
import { CitizenTable } from "./CitizenTable";
import { EndPayoutButton } from "./EndPayoutButton";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseManagementPayout = ({ cycleData }: Props) => {
  return (
    <Phase
      phase={CyclePhase.Payout}
      currentPhase={cycleData.currentPhase}
      innerClassName="overflow-hidden"
    >
      <h2 className="font-bold text-center font-mono uppercase">Auszahlung</h2>

      <div className="flex gap-[2px] border-t border-white/5 mt-4 pt-4">
        <StatisticTile label="aUEC noch auszubezahlen" className="flex-1">
          <ScrambleIn
            text={cycleData.openAuecPayout?.toLocaleString("de") ?? "-"}
            characters="1234567890."
          />
        </StatisticTile>

        <StatisticTile label="fehlende Zustimmungen" className="flex-1">
          <ScrambleIn
            text={cycleData.cycle.participants
              .filter(
                (participant) =>
                  !participant.acceptedAt && !participant.cededAt,
              )
              .length.toLocaleString("de")}
            characters="1234567890."
          />
        </StatisticTile>
      </div>

      <div className="flex justify-center mt-4">
        <div className="flex flex-col justify-center items-center text-sm">
          <h3 className="text-neutral-500">Endet am</h3>

          <p>{formatDate(cycleData.cycle.payoutEndedAt, "short") ?? "-"}</p>
          {/* TODO: Implement edit button */}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2 mt-2">
        <p className="text-center text-sm">
          Du kannst diese Phase sofort beenden.
        </p>

        <EndPayoutButton cycleData={cycleData} />
      </div>

      {[CyclePhase.Payout, CyclePhase.Completed].includes(
        cycleData.currentPhase,
      ) && (
        <div className="flex justify-center items-center gap-2 border-t border-white/5 pt-4 mt-4">
          <CitizenTable cycleData={cycleData} />
        </div>
      )}
    </Phase>
  );
};
