"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
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
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaTrash />}
          Task löschen
        </Button2>
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
