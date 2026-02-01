"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import type { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries";
import clsx from "clsx";
import { useId } from "react";
import { FaSpinner } from "react-icons/fa";
import { toggleMyAccepted } from "../actions/toggleMyAccepted";
import { CyclePhase } from "../utils/getCurrentPhase";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const ToggleMyAcceptedButton = ({ className, cycleData }: Props) => {
  const { formAction, isPending } = useAction(toggleMyAccepted);
  const id = useId();

  return (
    <form action={formAction} id={id} className={clsx(className)}>
      <input type="hidden" name="id" value={cycleData.cycle.id} />

      {cycleData.myParticipant?.acceptedAt ? (
        <>
          <input type="hidden" name="value" value="false" />
          <Button2
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Payout}
            type="submit"
          >
            {isPending && <FaSpinner className="animate-spin" />}
            Widerrufen
          </Button2>
        </>
      ) : (
        <>
          <input type="hidden" name="value" value="true" />
          <Button2
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Payout}
            type="submit"
            name="value"
            value={1}
          >
            {isPending && <FaSpinner className="animate-spin" />}
            Auszahlung zustimmen
          </Button2>
        </>
      )}
    </form>
  );
};
