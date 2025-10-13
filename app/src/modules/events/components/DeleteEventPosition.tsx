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
import { type EventPosition } from "@prisma/client";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deleteEventPosition } from "../actions/deleteEventPosition";

interface Props {
  readonly className?: string;
  readonly position: EventPosition;
}

export const DeleteEventPosition = ({ className, position }: Props) => {
  const { isPending, formAction } = useAction(deleteEventPosition);
  const formId = useId();

  return (
    <form action={formAction} id={formId} className={className}>
      <input type="hidden" name="id" value={position.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="text-brand-red-500 hover:text-brand-red-300 flex items-center px-2"
            title="Posten löschen"
          >
            <FaTrash />
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Posten löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du den Posten{" "}
              <span className="font-bold">{position.name}</span> löschen?
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
