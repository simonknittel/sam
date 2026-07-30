"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import { FaPlus } from "react-icons/fa";

export const CreateCitizenButton = () => {
  const { openCreateModal } = useCreateContext();

  return (
    <Button2
      variant={Button2Variant.Secondary}
      onClick={() => openCreateModal("citizen")}
      title="Neuen Citizen erstellen"
    >
      <FaPlus /> Citizen
    </Button2>
  );
};
