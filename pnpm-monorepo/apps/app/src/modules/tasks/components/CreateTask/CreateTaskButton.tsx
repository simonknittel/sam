"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const CreateTaskButton = ({ className }: Props) => {
  const { openCreateModal } = useCreateContext();

  return (
    <Button2
      onClick={() => openCreateModal("task")}
      className={clsx(className)}
      title="Neuer Task"
    >
      <FaPlus />
      <span className="hidden sm:inline">Neuer Task</span>
    </Button2>
  );
};
