"use client";

import { type Variant } from "@/generated/prisma/browser";
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
import Note from "@/modules/common/components/Note";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deleteVariant } from "../actions/deleteVariant";

interface Props {
  readonly className?: string;
  readonly variant: Pick<Variant, "id" | "name">;
  readonly shipCount: number;
}

export const DeleteVariantButton = ({
  className,
  variant,
  shipCount,
}: Props) => {
  const { isPending, formAction } = useAction(deleteVariant);
  const id = useId();

  return (
    <form action={formAction} id={id} className={className}>
      <input type="hidden" name="id" value={variant.id} />

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
              Willst du &quot;{variant.name}&quot; löschen?
            </AlertDialogDescription>

            {shipCount > 0 && (
              <Note
                type="error"
                message={
                  <p>
                    Diese Variante kann nicht gelöscht werden. Sie wird von{" "}
                    {shipCount} Schiffen verwendet. Kontaktiere <em>ind3x</em>{" "}
                    um sie mit einer anderen zu kombinieren/ersetzen oder zu
                    löschen.
                  </p>
                }
              />
            )}
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={id} disabled={shipCount > 0}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
