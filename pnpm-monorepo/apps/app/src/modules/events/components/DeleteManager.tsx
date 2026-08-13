"use client";

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
import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { type Entity, type Event } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useTransition } from "react";
import { FaTrash } from "react-icons/fa";
import { deleteManager } from "../actions/deleteManager";

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
  readonly managerId: Entity["id"];
}

export const DeleteManager = ({ className, eventId, managerId }: Props) => {
  const [isPending, startTransition] = useTransition();
  const formId = useId();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      await runAction(deleteManager, formData);
    });
  };

  return (
    <form action={formAction} id={formId} className={clsx(className)}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="managerId" value={managerId} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="text-brand-red-500 hover:text-brand-red-300 flex items-center px-2 h-full"
            title="Manager entfernen"
          >
            {isPending ? <AsciiSpinner /> : <FaTrash />}
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manager entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du diesen Manager vom Event entfernen?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={formId}>
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
