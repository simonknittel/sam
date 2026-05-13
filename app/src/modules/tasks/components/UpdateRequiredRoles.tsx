"use client";

import { type Role, type Task } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useState } from "react";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";
import { updateRequiredRoles } from "../actions/updateRequiredRoles";
import { RequiredRoles } from "./CreateTask/RequiredRoles";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    readonly requiredRoles: Role[];
  };
}

export const UpdateRequiredRoles = ({ className, task }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await updateRequiredRoles(formData);

        if (response.error) {
          toast.error(response.error);
          console.error(response);
          return response;
        }

        toast.success(response.success!);
        setIsOpen(false);
        return response;
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
        return {
          error:
            "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
          requestPayload: formData,
        };
      }
    },
    null,
  );

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="tertiary"
        className={clsx("h-auto", className)}
        title="Erforderliche Rolle bearbeiten"
      >
        <FaPen />
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
        heading={<h2>Erforderliche Rolle bearbeiten</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={task.id} />

          <RequiredRoles
            defaultValue={task.requiredRoles.map((role) => role.id)}
          />

          <label className="mt-4 mb-2 block">
            Soll dieser Task für die anderen Rollen versteckt werden?
          </label>
          <YesNoCheckbox
            name="hiddenForOtherRoles"
            defaultChecked={task.hiddenForOtherRoles || false}
          />

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
          </Button2>

          {state?.error && (
            <Note type="error" message={state.error} className="mt-4" />
          )}
        </form>
      </Modal>
    </>
  );
};
