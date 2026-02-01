"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { type OperationUnit } from "@prisma/client";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import CreateSquadronFlightModal from "./CreateSquadronFlightModal";

interface Props {
  parentUnit: OperationUnit;
}

const CreateSquadronFlight = ({ parentUnit }: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center">
      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
      >
        Flight hinzufügen <FaPlus />
      </Button2>

      <CreateSquadronFlightModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        parentUnit={parentUnit}
      />
    </div>
  );
};

export default CreateSquadronFlight;
