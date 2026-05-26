"use client";

import type { LogAnalyzerPattern } from "@/generated/prisma/client";
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
import clsx from "clsx";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { deleteLogAnalyzerPattern } from "../actions/deleteLogAnalyzerPattern";

interface Props {
  readonly className?: string;
  readonly pattern: Pick<LogAnalyzerPattern, "id" | "title">;
}

export const DeleteLogAnalyzerPattern = ({ className, pattern }: Props) => {
  const { state, formAction, isPending } = useAction(deleteLogAnalyzerPattern);
  const formId = useId();

  return (
    <section className={clsx("bg-secondary rounded-primary p-4", className)}>
      <form action={formAction} id={formId}>
        <input type="hidden" name="id" value={pattern.id} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button2 disabled={isPending}>
              {isPending ? <FaSpinner className="animate-spin" /> : <FaTrash />}
              L&#246;schen
            </Button2>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Muster l&#246;schen?</AlertDialogTitle>
              <AlertDialogDescription>
                Willst du das Muster{" "}
                <span className="font-bold">{pattern.title}</span> wirklich
                l&#246;schen?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>

              <AlertDialogAction type="submit" form={formId}>
                L&#246;schen
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
