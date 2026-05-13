"use client";

import {
  type Manufacturer,
  type Series,
  type Ship,
  type Variant,
} from "@/generated/prisma/browser";
import { useState } from "react";
import { FaPen } from "react-icons/fa";
import EditShipModal from "./EditShipModal";

interface Props {
  ship: Ship & {
    variant: Variant & {
      series: Series & {
        manufacturer: Manufacturer;
      };
    };
  };
}

const EditShip = ({ ship }: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="px-2 py-2 text-neutral-500 hover:text-neutral-50"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <FaPen />
      </button>

      <EditShipModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        ship={ship}
      />
    </>
  );
};

export default EditShip;
