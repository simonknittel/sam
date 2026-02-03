"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { type Manufacturer, type Series } from "@prisma/client";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaPlus, FaSpinner } from "react-icons/fa";

const CreateVariantModal = dynamic(() =>
  import("./CreateVariantModal").then((mod) => mod.CreateVariantModal),
);

interface Props {
  readonly className?: string;
  readonly manufacturerId: Manufacturer["id"];
  readonly seriesId: Series["id"];
}

export const CreateVariantButton = ({
  className,
  manufacturerId,
  seriesId,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx(className, "flex justify-center")}>
      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
        title="Variante anlegen"
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
          <CreateVariantModal
            onRequestClose={() => setIsOpen(false)}
            manufacturerId={manufacturerId}
            seriesId={seriesId}
          />
        </Suspense>
      )}
    </div>
  );
};
