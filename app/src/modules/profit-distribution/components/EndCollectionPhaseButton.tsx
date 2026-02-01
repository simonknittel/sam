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
import { endCollectionPhase } from "../actions/endCollectionPhase";
import { CyclePhase } from "../utils/getCurrentPhase";

interface Props {
  readonly className?: string;
  readonly cycleData: NonNullable<
    Awaited<ReturnType<typeof getProfitDistributionCycleById>>
  >;
}

export const EndCollectionPhaseButton = ({ className, cycleData }: Props) => {
  const { formAction, isPending } = useAction(endCollectionPhase);
  const id = useId();

  return (
    <form action={formAction} id={id} className={clsx(className)}>
      <input type="hidden" name="id" value={cycleData.cycle.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button2
            disabled={
              cycleData.currentPhase !== CyclePhase.Collection || isPending
            }
            variant={Button2Variant.Secondary}
          >
            {isPending && <FaSpinner className="animate-spin" />}
            Phase beenden
          </Button2>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sammelphase beenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du die Sammelphase von{" "}
              <strong>
                &ldquo;{cycleData.cycle.title}
                &rdquo;
              </strong>{" "}
              beenden?
              <br />
              Es wird ein Abbild der aktuellen SILC-Konten von allen Membern
              erstellt. Im Anschluss werden die Konten auf 0 zurückgesetzt,
              womit die Sammelphase des nächsten SINcome-Zeitraums startet.
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
