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
import { type Task } from "@prisma/client";
import { useId } from "react";
import { FaTrash } from "react-icons/fa";
import { deleteTask } from "../actions/deleteTask";

interface Props {
  readonly className?: string;
  readonly task: Task;
}

export const DeleteTask = ({ className, task }: Props) => {
  const { formAction, isPending } = useAction(deleteTask);
  const formId = useId();

  return (
    <form action={formAction} id={formId} className={className}>
      <input type="hidden" name="id" value={task.id} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="text-brand-red-500 hover:text-brand-red-300 flex items-center px-2 h-full"
            title="Task löschen"
          >
            <FaTrash />
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Task löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Willst du den Task <span className="font-bold">{task.title}</span>{" "}
              löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={formId}>
              {isPending && <FaTrash />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
