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
import { Link } from "@/modules/common/components/Link";
import { type User } from "@prisma/client";
import { unstable_rethrow } from "next/navigation";
import { useId, useTransition } from "react";
import toast from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";
import { verifyEmailAction } from "../actions/verifyEmail";

interface Props {
  readonly className?: string;
  readonly userId: User["id"];
}

export const VerifyEmailButton = ({ className, userId }: Props) => {
  const [isPending, startTransition] = useTransition();
  const id = useId();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      try {
        const response = await verifyEmailAction(formData);

        if ("success" in response) {
          toast.success(response.success);
        } else {
          toast.error(response.error);
          console.error(response);
        }
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  };

  return (
    <form action={formAction} id={id} className={className}>
      <input type="hidden" name="userId" value={userId} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="py-2 text-brand-red-500 hover:underline flex gap-2 items-center"
            title="Datenschutzerklärung bestätigen"
          >
            {isPending && <FaSpinner className="animate-spin" />}
            Bestätigen
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Datenschutzerklärung bestätigen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bitte stelle sicher, dass der Benutzer die{" "}
              <Link
                href="/privacy"
                className="text-brand-red-500 hover:underline"
              >
                Datenschutzerklärung
              </Link>{" "}
              gelesen und akzeptiert hat.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction type="submit" form={id}>
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
