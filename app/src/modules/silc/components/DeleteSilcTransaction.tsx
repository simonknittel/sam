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
import { type SilcTransaction } from "@prisma/client";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deleteSilcTransaction } from "../actions/deleteSilcTransaction";

interface Props {
  readonly className?: string;
  readonly id: SilcTransaction["id"];
}

export const DeleteSilcTransaction = ({ className, id }: Props) => {
  const { isPending, formAction } = useAction(deleteSilcTransaction);
  const formId = useId();

  return (
    <form action={formAction} id={formId} className={className}>
      <input type="hidden" name="id" value={id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="text-brand-red-500 hover:text-brand-red-300 flex items-center text-xs"
            title="Löschen"
          >
            <FaTrash />
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transaktion löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du diesen Eintrag löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={formId}>
              {isPending && <FaSpinner className="animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
