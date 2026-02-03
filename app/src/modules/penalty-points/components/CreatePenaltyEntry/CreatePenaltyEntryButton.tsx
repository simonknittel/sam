"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const CreatePenaltyEntryButton = ({ className }: Props) => {
  const { openCreateModal } = useCreateContext();

  return (
    <Button2
      onClick={() => openCreateModal("penaltyEntry")}
      variant={Button2Variant.Secondary}
      className={clsx(className)}
      title="Neue Strafpunkte"
    >
      <FaPlus />
      <span className="hidden md:inline">Neue Strafpunkte</span>
    </Button2>
  );
};
