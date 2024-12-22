"use client";

import Button from "@/common/components/Button";
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
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Unit hinzufügen <FaPlus />
      </Button>

      <CreateUnitModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        operation={operation}
      />
    </>
  );
};

export default CreateUnit;
