"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import Modal from "@/modules/common/components/Modal";
import { type Role, type Task } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaPen, FaSave } from "react-icons/fa";
import { updateRequiredRoles } from "../actions/updateRequiredRoles";
import { RequiredRoles } from "./CreateTask/RequiredRoles";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    readonly requiredRoles: readonly Pick<Role, "id">[];
  };
}

export const UpdateRequiredRoles = ({ className, task }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, isPending } = useAction(updateRequiredRoles, {
    errorToast: false,
    onSuccess: () => setIsOpen(false),
  });

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
        className="w-120"
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
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
