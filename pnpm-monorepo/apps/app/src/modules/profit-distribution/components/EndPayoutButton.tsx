"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import type { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries/getProfitDistributionCycleById";
import { endPayout } from "../actions/endPayout";
import { CyclePhase } from "../utils/getCurrentPhase";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const EndPayoutButton = ({ className, cycleData }: Props) => {
  const openAcceptances = cycleData.cycle.participants.filter(
    (participant) => participant.acceptedAt && !participant.disbursedAt,
  ).length;

  return (
    <ConfirmActionButton
      className={className}
      action={endPayout}
      hiddenFields={[{ name: "id", value: cycleData.cycle.id }]}
      trigger={(isPending) => (
        <Button2
          disabled={cycleData.currentPhase !== CyclePhase.Payout || isPending}
          variant={Button2Variant.Secondary}
        >
          {isPending && <AsciiSpinner />}
          Phase beenden
        </Button2>
      )}
      title="Auszahlung beenden?"
      description={
        <>
          Willst du die Auszahlung von{" "}
          <strong>
            &ldquo;{cycleData.cycle.title}
            &rdquo;
          </strong>{" "}
          beenden?
          <br />
          Dieser SINcome-Zeitraum wird hiermit geschlossen.
          {openAcceptances > 0 && (
            <>
              <br />
              <strong>{openAcceptances}</strong> Member haben der Auszahlung
              zugestimmt, wurden aber noch nicht ausgezahlt.
            </>
          )}
        </>
      }
      confirmLabel="Beenden"
    />
  );
};
