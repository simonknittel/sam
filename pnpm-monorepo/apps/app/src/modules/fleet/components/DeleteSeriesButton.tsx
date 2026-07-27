"use client";

import { type Series } from "@/generated/prisma/browser";
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
import Button from "@/modules/common/components/Button";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deleteSeries } from "../actions/deleteSeries";

interface Props {
  readonly className?: string;
  readonly series: Pick<Series, "id" | "name">;
}

export const DeleteSeriesButton = ({ className, series }: Props) => {
  const { isPending, formAction } = useAction(deleteSeries);
  const id = useId();

  return (
    <form action={formAction} id={id} className={className}>
      <input type="hidden" name="id" value={series.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="tertiary" disabled={isPending}>
            {isPending ? <FaSpinner className="animate-spin" /> : <FaTrash />}{" "}
            Löschen
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schiff löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du &quot;{series.name}&quot; löschen?
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
