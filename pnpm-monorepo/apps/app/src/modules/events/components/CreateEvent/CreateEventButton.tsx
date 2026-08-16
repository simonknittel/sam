"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const CreateEventButton = ({ className }: Props) => {
  const { openCreateModal } = useCreateContext();

  return (
    <Button2
      onClick={() => openCreateModal("event")}
      className={clsx(className)}
      title="Event erstellen"
    >
      <FaPlus />
      <span className="hidden sm:inline">Event erstellen</span>
    </Button2>
  );
};
