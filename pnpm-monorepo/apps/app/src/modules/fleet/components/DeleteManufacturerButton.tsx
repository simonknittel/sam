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
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { type Manufacturer } from "@sam-monorepo/database/browser";
import { useId } from "react";
import { FaTrash } from "react-icons/fa";
import { deleteManufacturer } from "../actions/deleteManufacturer";

interface Props {
  readonly className?: string;
  readonly manufacturer: Pick<Manufacturer, "id" | "name">;
}

export const DeleteManufacturerButton = ({
  className,
  manufacturer,
}: Props) => {
  const { isPending, formAction } = useAction(deleteManufacturer);
  const id = useId();

  return (
    <form action={formAction} id={id} className={className}>
      <input type="hidden" name="id" value={manufacturer.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="tertiary" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schiff löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du &quot;{manufacturer.name}&quot; löschen?
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
