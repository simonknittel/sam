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
import type { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries";
import clsx from "clsx";
import { useId } from "react";
import { FaSpinner } from "react-icons/fa";
import { endPayout } from "../actions/endPayout";
import { CyclePhase } from "../utils/getCurrentPhase";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const EndPayoutButton = ({ className, cycleData }: Props) => {
  const { formAction, isPending } = useAction(endPayout);
  const id = useId();

  const openAcceptances = cycleData.cycle.participants.filter(
    (participant) => participant.acceptedAt && !participant.disbursedAt,
  ).length;

  return (
    <form action={formAction} id={id} className={clsx(className)}>
      <input type="hidden" name="id" value={cycleData.cycle.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button2
            disabled={cycleData.currentPhase !== CyclePhase.Payout || isPending}
            variant={Button2Variant.Secondary}
          >
            {isPending && <FaSpinner className="animate-spin" />}
            Phase beenden
          </Button2>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auszahlung beenden?</AlertDialogTitle>
            <AlertDialogDescription>
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
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={id}>
              Beenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
