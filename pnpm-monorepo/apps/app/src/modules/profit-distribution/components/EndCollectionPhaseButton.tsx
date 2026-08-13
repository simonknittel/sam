"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import type { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries/getProfitDistributionCycleById";
import { endCollectionPhase } from "../actions/endCollectionPhase";
import { CyclePhase } from "../utils/getCurrentPhase";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const EndCollectionPhaseButton = ({ className, cycleData }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={endCollectionPhase}
      hiddenFields={[{ name: "id", value: cycleData.cycle.id }]}
      trigger={(isPending) => (
        <Button2
          disabled={
            cycleData.currentPhase !== CyclePhase.Collection || isPending
          }
          variant={Button2Variant.Secondary}
        >
          {isPending && <AsciiSpinner />}
          Phase beenden
        </Button2>
      )}
      title="Sammelphase beenden?"
      description={
        <>
          Willst du die Sammelphase von{" "}
          <strong>
            &ldquo;{cycleData.cycle.title}
            &rdquo;
          </strong>{" "}
          beenden?
          <br />
          Es wird ein Abbild der aktuellen SILC-Konten von allen Membern
          erstellt. Im Anschluss werden die Konten auf 0 zurückgesetzt, womit
          die Sammelphase des nächsten SINcome-Zeitraums startet.
        </>
      }
      confirmLabel="Beenden"
    />
  );
};
