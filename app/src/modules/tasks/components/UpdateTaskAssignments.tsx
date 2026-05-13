"use client";

import { type Task, type TaskAssignment } from "@/generated/prisma/browser";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useState } from "react";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";
import { updateTaskAssignments } from "../actions/updateTaskAssignments";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    readonly assignments: TaskAssignment[];
  };
}

export const UpdateTaskAssignments = ({ className, task }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await updateTaskAssignments(formData);

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
        title="Zuordnung bearbeiten"
      >
        <FaPen />
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
        heading={<h2>Zuordnung bearbeiten</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={task.id} />

          <NumberInput
            name="assignmentLimit"
            label="Von wie vielen Citizen kann der Task angenommen werden?"
            hint="optional"
            defaultValue={
              state?.requestPayload?.has("assignmentLimit")
                ? (state.requestPayload.get("assignmentLimit") as string)
                : task.assignmentLimit || undefined
            }
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
