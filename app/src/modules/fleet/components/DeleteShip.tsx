"use client";

import { type Ship, type Variant } from "@/generated/prisma/browser";
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
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deleteShipAction } from "../actions/deleteShipAction";

interface Props {
  readonly className?: string;
  readonly ship: Ship & {
    variant: Variant;
  };
}

export const DeleteShip = ({ className, ship }: Props) => {
  const { isPending, formAction } = useAction(deleteShipAction);
  const id = useId();

  return (
    <form action={formAction} id={id} className={className}>
      <input type="hidden" name="id" value={ship.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="px-2 py-2 text-neutral-500 hover:text-neutral-50 hover:cursor-pointer"
            title="Löschen"
          >
            {isPending ? <FaSpinner className="animate-spin" /> : <FaTrash />}
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schiff löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du &quot;{ship.name || ship.variant.name}&quot; löschen?
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
