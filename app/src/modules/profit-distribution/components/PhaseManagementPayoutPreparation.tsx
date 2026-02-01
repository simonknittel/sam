"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/common/components/AlertDialog";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateInput } from "@/modules/common/components/form/DateInput";
import { NumberInputFormatted } from "@/modules/common/components/form/NumberInput";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { useId, useState, type KeyboardEventHandler } from "react";
import { FaSpinner } from "react-icons/fa";
import { startPayout } from "../actions/startPayout";
import type { getProfitDistributionCycleById } from "../queries";
import { getAuecPerSilc } from "../utils/getAuecPerSilc";
import { CyclePhase } from "../utils/getCurrentPhase";
import { CitizenTable } from "./CitizenTable";
import { Phase } from "./Phase";

interface Props {
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const PhaseManagementPayoutPreparation = ({ cycleData }: Props) => {
  const { formAction, isPending } = useAction(startPayout);
  const id = useId();
  const [auecProfit, setAuecProfit] = useState(
    Number(cycleData.cycle.auecProfit) || 0,
  );
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const auecPerSilc = getAuecPerSilc(auecProfit, cycleData.totalSilc);

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setIsAlertOpen(true);
  };

  return (
    <Phase
      phase={CyclePhase.PayoutPreparation}
      currentPhase={cycleData.currentPhase}
      innerClassName="overflow-hidden"
    >
      <form action={formAction} id={id}>
        <input type="hidden" name="id" value={cycleData.cycle.id} />

        <h2 className="text-center font-bold">Vorbereitung der Auszahlung</h2>

        <div
          className="flex border-t border-white/5 mt-4 pt-4"
          onKeyDown={handleKeyDown}
        >
          <div className="w-full max-w-80 mx-auto text-center">
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

          <div className="w-full max-w-80 mx-auto text-center">
            <DateInput
              name="payoutEndedAt"
              label="Auszahlungsphase endet am"
              disabled={cycleData.currentPhase !== CyclePhase.PayoutPreparation}
              defaultValue={
                cycleData.cycle.payoutEndedAt?.toISOString().split("T")[0] || ""
              }
              className="text-center"
            />
          </div>
        </div>

        <div className="flex gap-[2px] mt-4">
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
            {auecPerSilc.toLocaleString("de")}
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
            {(auecPerSilc * cycleData.totalSilc).toLocaleString("de")}
          </StatisticTile>
        </div>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogTrigger asChild>
            <Button2
              disabled={
                cycleData.currentPhase !== CyclePhase.PayoutPreparation ||
                isPending
              }
              variant={Button2Variant.Secondary}
              className="mx-auto mt-4"
            >
              {isPending && <FaSpinner className="animate-spin" />}
              Auszahlungsphase starten
            </Button2>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Auszahlungsphase beenden?</AlertDialogTitle>
              <AlertDialogDescription>
                Willst du die Auszahlungsphase von &ldquo;
                {cycleData.cycle.title}
                &rdquo; starten?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>

              <AlertDialogAction type="submit" form={id}>
                Starten
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>

      {cycleData.currentPhase === CyclePhase.PayoutPreparation && (
        <div className="flex justify-center items-center gap-2 border-t border-white/5 pt-4 mt-4">
          <CitizenTable cycleData={cycleData} />
        </div>
      )}
    </Phase>
  );
};
