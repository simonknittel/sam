"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const CreateManualNotificationButton = ({ className }: Props) => {
  const { openCreateModal } = useCreateContext();

  return (
    <Button2
      onClick={() => openCreateModal("manualNotification")}
      className={clsx(className)}
      title="Neue Benachrichtigung"
    >
      <FaPlus />
      <span className="hidden sm:inline">Neue Benachrichtigung</span>
    </Button2>
  );
};
