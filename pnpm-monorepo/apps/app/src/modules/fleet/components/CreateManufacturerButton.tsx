"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaPlus } from "react-icons/fa";

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
        Neu {isOpen ? <AsciiSpinner /> : <FaPlus />}
      </Button2>

      {isOpen && (
        /**
         * Without this boundary, the `dynamic()` shows the fallback of the
         * closest `Suspense`, possibly for the whole page.
         */
        <Suspense>
          <CreateManufacturerModal onRequestClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
