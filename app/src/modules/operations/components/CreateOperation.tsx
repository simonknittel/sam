"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { CreateOperationModal } from "./CreateOperationModal";

export const CreateOperation = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
      >
        Neue Operation <FaPlus />
      </Button2>

      <CreateOperationModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
      />
    </>
  );
};
