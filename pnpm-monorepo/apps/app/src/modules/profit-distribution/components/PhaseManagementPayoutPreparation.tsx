"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import {
  AlertDialog,
  useSubmitConfirmation,
} from "@/modules/common/components/AlertDialog";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateInput } from "@/modules/common/components/form/DateInput";
import { NumberInputFormatted } from "@/modules/common/components/form/NumberInput";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { CyclePhase, getAuecPerSilc } from "@sam-monorepo/domain";
import { useState } from "react";
import { startPayout } from "../actions/startPayout";
import type { getProfitDistributionCycleById } from "../queries/getProfitDistributionCycleById";
import { CitizenTable } from "./CitizenTable";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseManagementPayoutPreparation = ({ cycleData }: Props) => {
  const { formAction, isPending } = useAction(startPayout);
  const [auecProfit, setAuecProfit] = useState(
    Number(cycleData.cycle.auecProfit) || 0,
  );
  const confirmation = useSubmitConfirmation();

  const auecPerSilc = getAuecPerSilc(auecProfit, cycleData.totalSilc);

  return (
    <Phase
      phase={CyclePhase.PayoutPreparation}
      currentPhase={cycleData.currentPhase}
      innerClassName="overflow-hidden"
    >
      <form action={formAction} onSubmit={confirmation.onSubmit}>
        <input type="hidden" name="id" value={cycleData.cycle.id} />

        <h2 className="text-center font-mono font-bold uppercase">
          Vorbereitung der Auszahlung
        </h2>

        <div className="mt-4 flex border-t border-white/5 pt-4">
          <div className="mx-auto w-full max-w-80 text-center">
            <NumberInputFormatted
              label="Gesamter aUEC-Überschuss"
              disabled={cycleData.currentPhase !== CyclePhase.PayoutPreparation}
              value={auecProfit}
              onValueChange={(values) => {
                setAuecProfit(values.floatValue || 0);
              }}
              min={0}
              step={0}
              className="text-center"
            />
            <input type="hidden" name="auecProfit" value={auecProfit} />
          </div>

          <div className="mx-auto w-full max-w-80 text-center">
            <DateInput
              name="payoutEndsAt"
              label="Auszahlungsphase endet am"
              disabled={cycleData.currentPhase !== CyclePhase.PayoutPreparation}
              defaultValue={
                cycleData.cycle.payoutEndsAt?.toISOString().split("T")[0] || ""
              }
              className="text-center"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-0.5">
          <StatisticTile
            label="aUEC pro SILC (kaufmännisch gerundet)"
            preLabel={
              <>
                {auecProfit.toLocaleString("de")} aUEC /{" "}
                {cycleData.totalSilc.toLocaleString("de")} SILC =
              </>
            }
            className="flex-1"
          >
            <ScrambleIn
              text={auecPerSilc.toLocaleString("de")}
              characters="1234567890."
            />
          </StatisticTile>

          <StatisticTile
            label="auszuzahlende aUEC (kaufmännisch gerundet)"
            preLabel={
              <>
                {auecPerSilc.toLocaleString("de")} aUEC *{" "}
                {cycleData.totalSilc.toLocaleString("de")} SILC =
              </>
            }
            className="flex-1"
          >
            <ScrambleIn
              text={(auecPerSilc * cycleData.totalSilc).toLocaleString("de")}
              characters="1234567890."
            />
          </StatisticTile>
        </div>

        <Button2
          type="submit"
          disabled={
            cycleData.currentPhase !== CyclePhase.PayoutPreparation || isPending
          }
          variant={Button2Variant.Secondary}
          className="mx-auto mt-4"
        >
          {isPending && <AsciiSpinner />}
          Auszahlungsphase starten
        </Button2>

        <AlertDialog
          isOpen={confirmation.isOpen}
          onClose={confirmation.close}
          title="Auszahlungsphase beenden?"
          description={
            <>
              Willst du die Auszahlungsphase von &ldquo;
              {cycleData.cycle.title}
              &rdquo; starten?
            </>
          }
          confirmLabel="Starten"
        />
      </form>

      {cycleData.currentPhase === CyclePhase.PayoutPreparation && (
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/5 pt-4">
          <CitizenTable cycleData={cycleData} />
        </div>
      )}
    </Phase>
  );
};
