"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const CreateRoleButton = ({ className }: Props) => {
  const { openCreateModal } = useCreateContext();

  return (
    <Button2
      onClick={() => openCreateModal("role")}
      className={clsx(className)}
    >
      <FaPlus />
      Neue Rolle
    </Button2>
  );
};
