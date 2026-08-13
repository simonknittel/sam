"use client";

import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Task } from "@sam-monorepo/database/browser";
import { TbCancel } from "react-icons/tb";
import { cancelTask } from "../actions/cancelTask";

interface Props {
  readonly className?: string;
  readonly task: Task;
}

export const CancelTask = ({ className, task }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={cancelTask}
      hiddenFields={[{ name: "id", value: task.id }]}
      trigger={(isPending) => (
        <button
          disabled={isPending}
          className="text-brand-red-500 hover:text-brand-red-300 flex items-center px-2 h-full enabled:cursor-pointer"
          title="Task abbrechen"
        >
          <TbCancel />
        </button>
      )}
      title="Task abbrechen?"
      description={
        <>
          Willst du den Task <span className="font-bold">{task.title}</span>{" "}
          abbrechen?
        </>
      }
      confirmLabel="Speichern"
    />
  );
};
