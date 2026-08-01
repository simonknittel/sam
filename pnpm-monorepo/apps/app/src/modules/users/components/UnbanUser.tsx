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
import { useId } from "react";
import { FaUnlock } from "react-icons/fa";
import { unbanUserAction } from "../actions/unbanUser";

interface Props {
  readonly userId: string;
}

export const UnbanUser = ({ userId }: Props) => {
  const { isPending, formAction } = useAction(unbanUserAction);
  const id = useId();

  return (
    <form action={formAction} id={id}>
      <input type="hidden" name="userId" value={userId} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="tertiary" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaUnlock />} Entsperren
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer entsperren?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Benutzer kann sich danach wieder anmelden.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={id}>
              Entsperren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
