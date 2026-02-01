"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaPlus, FaSpinner } from "react-icons/fa";

const CreateManufacturerModal = dynamic(() =>
  import("./CreateManufacturerModal").then(
    (mod) => mod.CreateManufacturerModal,
  ),
);

export const CreateManufacturereButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
      >
        Neu {isOpen ? <FaSpinner className="animate-spin" /> : <FaPlus />}
      </Button2>

      {isOpen && (
        /**
         * The `dynamic()` triggers the closest `Suspense` to show the fallback. This
         * leads to much bigger parts of the page or even the whole page showing the
         * fallback instead of only the button.
         */
        <Suspense>
          <CreateManufacturerModal onRequestClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
