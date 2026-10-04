"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import Button from "@/modules/common/components/Button";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { type Task, type TaskAssignment } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaPen, FaSave } from "react-icons/fa";
import { updateTaskAssignments } from "../actions/updateTaskAssignments";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    readonly assignments: readonly Pick<TaskAssignment, "citizenId">[];
  };
}

export const UpdateTaskAssignments = ({ className, task }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, getDefaultValueWithFallback } = useAction(
    updateTaskAssignments,
    {
      errorToast: false,
      onSuccess: () => setIsOpen(false),
    },
  );

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="tertiary"
        className={clsx("h-auto", className)}
        title="Zuordnung bearbeiten"
      >
        <FaPen />
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Zuordnung bearbeiten</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={task.id} />

          <NumberInput
            name="assignmentLimit"
            label="Von wie vielen Citizen kann der Task angenommen werden?"
            hint="optional"
            defaultValue={getDefaultValueWithFallback(
              "assignmentLimit",
              task.assignmentLimit || undefined,
            )}
            min={0}
          />

          <CitizenInput
            name="assignedToId"
            multiple
            autoFocus
            defaultValue={task.assignments.map(
              (assignment) => assignment.citizenId,
            )}
            className="mt-4"
          />

          <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
            Speichern
          </SubmitButton>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
