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
import { Textarea } from "@/modules/common/components/form/Textarea";
import { useId } from "react";
import { FaBan } from "react-icons/fa";
import { banUserAction } from "../actions/banUser";

interface Props {
  readonly userId: string;
}

export const BanUser = ({ userId }: Props) => {
  const { isPending, formAction } = useAction(banUserAction);
  const id = useId();

  return (
    <form action={formAction} id={id}>
      <input type="hidden" name="userId" value={userId} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="tertiary" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaBan />} Sperren
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer sperren?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Benutzer wird sofort abgemeldet und kann sich nicht mehr
              anmelden.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div>
            <Textarea
              label="Grund (optional)"
              name="reason"
              maxLength={500}
              form={id}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={id}>
              Sperren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
