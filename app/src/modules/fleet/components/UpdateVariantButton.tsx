"use client";

import { type Variant, type VariantTag } from "@/generated/prisma/browser";
import { useAction } from "@/modules/common/components/Actions";
import Button from "@/modules/common/components/Button";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaPen, FaSpinner } from "react-icons/fa";

const UpdateVariantModal = dynamic(() =>
  import("./UpdateVariantModal").then((mod) => mod.UpdateVariantModal),
);

interface Props {
  readonly className?: string;
  readonly variant: Pick<Variant & { tags: VariantTag[] }, "id" | "tags">;
}

export const UpdateVariantButton = ({ className, variant }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const action = useAction();

  return (
    <div className={clsx(className, "flex justify-center")}>
      <Button variant="tertiary" onClick={() => setIsOpen(true)}>
        {isOpen ? <FaSpinner className="animate-spin" /> : <FaPen />} Bearbeiten
      </Button>

      {isOpen && (
        /**
         * The `dynamic()` triggers the closest `Suspense` to show the fallback. This
         * leads to much bigger parts of the page or even the whole page showing the
         * fallback instead of only the button.
         */
        <Suspense>
          <UpdateVariantModal
            onRequestClose={() => {
              setIsOpen(false);
              action.setIsOpen(false);
            }}
            variant={variant}
          />
        </Suspense>
      )}
    </div>
  );
};
