"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { type Manufacturer } from "@prisma/client";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaPlus, FaSpinner } from "react-icons/fa";

const CreateSeriesModal = dynamic(() =>
  import("./CreateSeriesModal").then((mod) => mod.CreateSeriesModal),
);

interface Props {
  readonly className?: string;
  readonly manufacturerId?: Manufacturer["id"];
}

export const CreateSeriesButton = ({ className, manufacturerId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        className={className}
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
        title="Serie anlegen"
      >
        Anlegen {isOpen ? <FaSpinner className="animate-spin" /> : <FaPlus />}
      </Button2>

      {isOpen && (
        /**
         * The `dynamic()` triggers the closest `Suspense` to show the fallback. This
         * leads to much bigger parts of the page or even the whole page showing the
         * fallback instead of only the button.
         */
        <Suspense>
          <CreateSeriesModal
            onRequestClose={() => setIsOpen(false)}
            manufacturerId={manufacturerId}
          />
        </Suspense>
      )}
    </>
  );
};
