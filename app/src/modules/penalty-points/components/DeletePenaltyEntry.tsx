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
import { type PenaltyEntry } from "@prisma/client";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deletePenaltyEntry } from "../actions/deletePenaltyEntry";

interface Props {
  readonly className?: string;
  readonly entry: PenaltyEntry;
}

export const DeletePenaltyEntry = ({ className, entry }: Props) => {
  const { isPending, formAction } = useAction(deletePenaltyEntry);
  const id = useId();

  return (
    <form action={formAction} id={id} className={className}>
      <input type="hidden" name="id" value={entry.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="text-brand-red-500 hover:text-brand-red-300 flex items-center"
            title="Löschen"
          >
            {isPending ? <FaSpinner className="animate-spin" /> : <FaTrash />}
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Strafpunkte löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du diesen Eintrag löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={id}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
