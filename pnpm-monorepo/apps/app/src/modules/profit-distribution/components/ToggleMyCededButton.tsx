"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2Variant } from "@/modules/common/components/Button2";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import type { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries/getProfitDistributionCycleById";
import { CyclePhase } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useId } from "react";
import { toggleMyCeded } from "../actions/toggleMyCeded";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const ToggleMyCededButton = ({ className, cycleData }: Props) => {
  const { formAction } = useAction(toggleMyCeded);
  const id = useId();

  return (
    <form action={formAction} id={id} className={clsx(className)}>
      <input type="hidden" name="id" value={cycleData.cycle.id} />

      {cycleData.myParticipant?.cededAt ? (
        <>
          <input type="hidden" name="value" value="false" />
          <SubmitButton
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Collection}
          >
            Widerrufen
          </SubmitButton>
        </>
      ) : (
        <>
          <input type="hidden" name="value" value="true" />
          <SubmitButton
            variant={Button2Variant.Secondary}
            disabled={cycleData.currentPhase !== CyclePhase.Collection}
          >
            Anteil abtreten
          </SubmitButton>
        </>
      )}
    </form>
  );
};
