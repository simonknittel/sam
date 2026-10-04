"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2Variant } from "@/modules/common/components/Button2";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import type { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries/getProfitDistributionCycleById";
import { CyclePhase } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useId } from "react";
import { toggleMyAccepted } from "../actions/toggleMyAccepted";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const ToggleMyAcceptedButton = ({ className, cycleData }: Props) => {
  const { formAction } = useAction(toggleMyAccepted);
  const id = useId();

  return (
    <form action={formAction} id={id} className={clsx(className)}>
      <input type="hidden" name="id" value={cycleData.cycle.id} />

      {cycleData.myParticipant?.acceptedAt ? (
        <>
          <input type="hidden" name="value" value="false" />
          <SubmitButton
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Payout}
          >
            Widerrufen
          </SubmitButton>
        </>
      ) : (
        <>
          <input type="hidden" name="value" value="true" />
          {/*
            No name/value on the button: a submitter's entry is appended to
            the form data, and the action reads the last entry per key — so
            it would override the hidden field above with something the
            schema rejects.
          */}
          <SubmitButton
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Payout}
          >
            Auszahlung zustimmen
          </SubmitButton>
        </>
      )}
    </form>
  );
};
