"use client";

import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import type { VisibleTask } from "@sam-monorepo/application";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { deleteTask } from "../actions/deleteTask";

interface Props {
  readonly className?: string;
  readonly task: Pick<VisibleTask, "id" | "title">;
}

export const DeleteTask = ({ className, task }: Props) => {
  const router = useRouter();

  return (
    <ConfirmActionButton
      className={className}
      action={deleteTask}
      hiddenFields={[{ name: "id", value: task.id }]}
      trigger={(isPending) => (
        <button
          type="submit"
          disabled={isPending}
          className="flex h-full items-center px-2 text-brand-red-500 hover:text-brand-red-300 enabled:cursor-pointer"
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
      onSuccess={() => router.push("/app/tasks")}
    />
  );
};
