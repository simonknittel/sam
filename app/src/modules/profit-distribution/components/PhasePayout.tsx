"use client";

import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { getProfitDistributionCycleById } from "../queries";
import { CyclePhase } from "../utils/getCurrentPhase";
import { PayoutState } from "../utils/getMyPayoutStatus";
import { Phase } from "./Phase";
import { ToggleMyAcceptedButton } from "./ToggleMyAcceptedButton";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhasePayout = ({ cycleData }: Props) => {
  return (
    <Phase phase={CyclePhase.Payout} currentPhase={cycleData.currentPhase}>
      <h2 className="font-bold text-center font-mono uppercase">Auszahlung</h2>

      <div className="flex gap-[2px] border-t border-white/5 mt-4 pt-4">
        <StatisticTile label="Gesamter aUEC-Überschuss" className="flex-1">
          {cycleData.cycle.auecProfit?.toLocaleString("de") ?? "-"}
        </StatisticTile>

        <StatisticTile label="Dein Anteil" className="flex-1">
          {cycleData.myShare?.toLocaleString("de") ?? "-"}
        </StatisticTile>
      </div>

      <p className="text-neutral-500 text-sm text-center pt-2">
        Dein Anteil wird anhand deiner verdienten SILC und dem gesamten
        aUEC-Überschuss berechnet.
      </p>

      <StatisticTile label="Status deiner Auszahlung" className="mt-4">
        {cycleData.myPayoutState === PayoutState.NOT_PARTICIPATING && (
          <span>-</span>
        )}
        {cycleData.myPayoutState === PayoutState.CEDED && (
          <span>Abgetreten</span>
        )}
        {cycleData.myPayoutState === PayoutState.AWAITING_ACCEPTANCE && (
          <span className="text-red-500">Zustimmung ausstehend</span>
        )}
        {cycleData.myPayoutState === PayoutState.AWAITING_PAYOUT && (
          <span className="text-blue-500">Auszahlung ausstehend</span>
        )}
        {cycleData.myPayoutState === PayoutState.DISBURSED && (
          <span className="text-green-500">Ausgezahlt</span>
        )}
        {cycleData.myPayoutState === PayoutState.EXPIRED && (
          <span className="text-blue-500">Verfallen</span>
        )}
        {cycleData.myPayoutState === PayoutState.PAYOUT_OVERDUE && (
          <span className="text-red-500">Überfällig</span>
        )}
        {cycleData.myPayoutState === PayoutState.UNKNOWN && (
          <span className="text-red-500">Unbekannt</span>
        )}
      </StatisticTile>

      {cycleData.myPayoutState === PayoutState.DISBURSED && (
        <p className="text-neutral-500 text-sm text-center pt-2">
          Auszahlung geleistet durch{" "}
          <CitizenLink citizen={cycleData.myParticipant!.disbursedBy} /> am{" "}
          {formatDate(cycleData.myParticipant!.disbursedAt)}.
        </p>
      )}

      {[PayoutState.NOT_PARTICIPATING, PayoutState.DISBURSED].includes(
        cycleData.myPayoutState,
      ) === false && (
        <div className="flex flex-col justify-center items-center gap-2 border-t border-white/5 mt-4 pt-2">
          <div className="text-sm text-center flex flex-col gap-2">
            <p>
              Um deinen Anteil ausgezahlt zu bekommen, musst du der Auszahlung
              zustimmen.
            </p>

            <p>
              <strong>Wichtig:</strong> Stimme der Auszahlung erst zu, wenn du
              dir im aktuellen Star Citizen Patch bereits einen Charakter
              erstellt hast. Solltest du noch keinen Charakter erstellt haben,
              wird die Auszahlung scheitern und dein Anteil unwiderruflich
              verloren gehen.
            </p>

            <p>
              Wenn du der Auszahlung bis zum Ende dieser Phase nicht zustimmst,
              wird dein Anteil verfallen und der Organisation gutgeschrieben.
            </p>
          </div>

          {cycleData.myPayoutState === PayoutState.AWAITING_PAYOUT && (
            <>
              <p className="text-green-500 text-sm">
                Du hast der Auszahlung am{" "}
                {formatDate(cycleData.myParticipant!.acceptedAt)} zugestimmt.
              </p>

              <ToggleMyAcceptedButton cycleData={cycleData} />
            </>
          )}

          {cycleData.myPayoutState === PayoutState.AWAITING_ACCEPTANCE && (
            <ToggleMyAcceptedButton cycleData={cycleData} />
          )}
        </div>
      )}

      <div className="flex flex-col justify-center gap-4 border-t border-white/5 mt-4 pt-4">
        <div className="flex flex-col justify-center items-center text-sm">
          <h3 className="text-neutral-500">Endet am</h3>

          {cycleData.cycle.payoutEndedAt ? (
            <p>{formatDate(cycleData.cycle.payoutEndedAt, "short")}</p>
          ) : (
            <p className="text-neutral-500">-</p>
          )}
        </div>

        <p className="text-center text-sm">
          Nachdem deine Auszahlung getätigt wurde, ist dieser SINcome-Zeitraum
          für dich abgeschlossen.
        </p>
      </div>
    </Phase>
  );
};
