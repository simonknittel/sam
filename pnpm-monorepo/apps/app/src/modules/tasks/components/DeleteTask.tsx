"use client";

import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Task } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteTask } from "../actions/deleteTask";

interface Props {
  readonly className?: string;
  readonly task: Task;
}

export const DeleteTask = ({ className, task }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteTask}
      hiddenFields={[{ name: "id", value: task.id }]}
      trigger={(isPending) => (
        <button
          disabled={isPending}
          className="text-brand-red-500 hover:text-brand-red-300 flex items-center px-2 h-full enabled:cursor-pointer"
          title="Task löschen"
        >
          <FaTrash />
        </button>
      )}
      title="Task löschen?"
      description={
        <>
          Willst du den Task <span className="font-bold">{task.title}</span>{" "}
          löschen?
        </>
      }
      confirmLabel="Löschen"
    />
  );
};
