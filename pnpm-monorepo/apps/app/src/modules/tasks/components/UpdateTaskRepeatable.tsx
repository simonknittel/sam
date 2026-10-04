"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { type Task, type TaskAssignment } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaPen, FaSave } from "react-icons/fa";
import { updateTaskRepeatable } from "../actions/updateTaskRepeatable";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    readonly assignments: readonly Pick<TaskAssignment, "citizenId">[];
  };
}

export const UpdateTaskRepeatable = ({ className, task }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, getDefaultValueWithFallback } = useAction(
    updateTaskRepeatable,
    {
      onSuccess: () => setIsOpen(false),
    },
  );

  const handleClick = () => {
    setIsOpen(true);
  };

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        type="button"
        title="Bearbeiten"
        className={clsx(
          "text-brand-red-500 hover:text-brand-red-300",
          className,
        )}
      >
        <FaPen />
      </button>

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-120"
        heading={<h2>Bearbeiten</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={task.id} />

          <NumberInput
            name="repeatable"
            label="Wie häufig kann dieser Task abgeschlossen werden?"
            defaultValue={getDefaultValueWithFallback(
              "repeatable",
              task.repeatable || 1,
            )}
            required
            min={1}
          />

          <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
            Speichern
          </SubmitButton>

          {state && "error" in state && (
            <Note type="error" message={state.error} className="mt-4" />
          )}
        </form>
      </Modal>
    </>
  );
};
