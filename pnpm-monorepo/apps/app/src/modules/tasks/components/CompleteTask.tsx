"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import {
  TaskRewardType,
  type Task,
  type TaskAssignment,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaCheck, FaSave } from "react-icons/fa";
import { completeTask } from "../actions/completeTask";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    assignments: TaskAssignment[];
  };
}

export const CompleteTask = ({ className, task }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, isPending } = useAction(completeTask, {
    errorToast: false,
    onSuccess: () => setIsOpen(false),
  });

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
        className="w-120"
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
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
