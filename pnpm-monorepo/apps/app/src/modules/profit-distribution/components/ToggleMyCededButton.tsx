"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import type { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries/getProfitDistributionCycleById";
import clsx from "clsx";
import { useId } from "react";
import { toggleMyCeded } from "../actions/toggleMyCeded";
import { CyclePhase } from "../utils/getCurrentPhase";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const ToggleMyCededButton = ({ className, cycleData }: Props) => {
  const { formAction, isPending } = useAction(toggleMyCeded);
  const id = useId();

  return (
    <form action={formAction} id={id} className={clsx(className)}>
      <input type="hidden" name="id" value={cycleData.cycle.id} />

      {cycleData.myParticipant?.cededAt ? (
        <>
          <input type="hidden" name="value" value="false" />
          <Button2
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Collection}
            type="submit"
          >
            {isPending && <AsciiSpinner />}
            Widerrufen
          </Button2>
        </>
      ) : (
        <>
          <input type="hidden" name="value" value="true" />
          <Button2
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Collection}
            type="submit"
          >
            {isPending && <AsciiSpinner />}
            Anteil abtreten
          </Button2>
        </>
      )}
    </form>
  );
};
