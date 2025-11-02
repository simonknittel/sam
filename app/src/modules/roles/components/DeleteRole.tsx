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
import { Button2 } from "@/modules/common/components/Button2";
import { Note } from "@/modules/common/components/Note";
import type { Role } from "@prisma/client";
import clsx from "clsx";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deleteRole } from "../actions/deleteRole";

interface Props {
  readonly className?: string;
  readonly role: Pick<Role, "id" | "name">;
}

export const DeleteRole = ({ className, role }: Props) => {
  const { state, formAction, isPending } = useAction(deleteRole);
  const formId = useId();

  return (
    <section
      className={clsx("background-secondary rounded-primary p-4", className)}
    >
      <form action={formAction} id={formId}>
        <input type="hidden" name="id" value={role.id} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button2 disabled={isPending}>
              {isPending ? <FaSpinner className="animate-spin" /> : <FaTrash />}{" "}
              Löschen
            </Button2>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rolle löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Willst du die Rolle{" "}
                <span className="font-bold">{role.name}</span> wirklich löschen?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>

              <AlertDialogAction type="submit" form={formId}>
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {state && "error" in state && (
          <Note
            type="error"
            message={state.error}
            className={clsx("mt-4", {
              "animate-pulse": isPending,
            })}
          />
        )}
      </form>
    </section>
  );
};
