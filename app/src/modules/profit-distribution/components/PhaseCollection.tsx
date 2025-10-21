"use client";

import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import type { getProfitDistributionCycleById } from "../queries";
import { CyclePhase } from "../utils/getCurrentPhase";
import { Phase } from "./Phase";
import { ToggleMyCededButton } from "./ToggleMyCededButton";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseCollection = ({ cycleData }: Props) => {
  return (
    <Phase phase={CyclePhase.Collection} currentPhase={cycleData.currentPhase}>
      <h2 className="font-bold text-center">Sammelphase</h2>

      <div className="border-t border-white/5 mt-4 pt-4">
        <StatisticTile label="Bisher von dir verdiente SILC">
          <span
            className={clsx({
              "text-green-500":
                cycleData.mySilcBalance && cycleData.mySilcBalance > 0,
              "text-red-500":
                cycleData.mySilcBalance && cycleData.mySilcBalance < 0,
            })}
          >
            {cycleData.mySilcBalance || 0}
          </span>
        </StatisticTile>
      </div>

      <div className="flex flex-col justify-center items-center gap-2 mt-4">
        <p className="text-center text-sm">
          Du kannst deinen Anteil für diesen Zeitraum freiwillig abtreten. Dieser
          wird dann auf die anderen Member verteilt.
        </p>

        {cycleData.myParticipant?.cededAt ? (
          <>
            <p className="text-sm text-green-500">
              Du hast deinen Anteil am{" "}
              {formatDate(cycleData.myParticipant.cededAt)} abgetreten.
            </p>

            <ToggleMyCededButton cycleData={cycleData} />
          </>
        ) : (
          <ToggleMyCededButton cycleData={cycleData} />
        )}
      </div>

      <div className="flex flex-col justify-center gap-4 border-t border-white/5 mt-4 pt-4">
        <div className="flex flex-col justify-center items-center text-sm">
          <h3 className="text-neutral-500">Endet am</h3>

          <p>{formatDate(cycleData.cycle.collectionEndedAt, "short")}</p>
        </div>

        <p className="text-center text-sm">
          Nach Ende der Sammelphase wird von Economics die Auszahlung
          vorbereitet. Sobald die Auszahlung beginnt, musst du dieser
          selbstständig zustimmen. Details hierzu folgen sobald die
          Auszahlungsphase beginnt.
        </p>
      </div>
    </Phase>
  );
};
