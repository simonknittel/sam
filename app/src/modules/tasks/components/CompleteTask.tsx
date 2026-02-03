"use client";

import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { TaskRewardType, type Task, type TaskAssignment } from "@prisma/client";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useActionState, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaSave, FaSpinner } from "react-icons/fa";
import { completeTask } from "../actions/completeTask";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    assignments: TaskAssignment[];
  };
}

export const CompleteTask = ({ className, task }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await completeTask(formData);

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

  const handleClick = () => {
    setIsOpen(true);
  };

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Button2
        variant={Button2Variant.Secondary}
        onClick={handleClick}
        title="Task abschließen"
        className={clsx(className)}
      >
        Abschließen <FaCheck />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-[480px]"
        heading={<h2>Task abschließen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={task.id} />

          <CitizenInput
            name="completionistId"
            multiple
            autoFocus
            defaultValue={task.assignments.map(
              (assignment) => assignment.citizenId,
            )}
          />

          {task.rewardType === TaskRewardType.TEXT && (
            <p className="mt-4">
              Bitte denke daran den Citizen ihre Belohnung zu geben.
            </p>
          )}
          {(task.rewardType === TaskRewardType.SILC ||
            task.rewardType === TaskRewardType.NEW_SILC) && (
            <p className="mt-4">
              SILC-Belohnungen werden automatisiert denen zugeschrieben, die den
              Task angenommen haben.
            </p>
          )}

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
