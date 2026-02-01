"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { type Operation } from "@prisma/client";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import CreateUnitModal from "./CreateUnitModal";

interface Props {
  operation: Operation;
}

const CreateUnit = ({ operation }: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
      >
        Unit hinzufügen <FaPlus />
      </Button2>

      <CreateUnitModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        operation={operation}
      />
    </>
  );
};

export default CreateUnit;
