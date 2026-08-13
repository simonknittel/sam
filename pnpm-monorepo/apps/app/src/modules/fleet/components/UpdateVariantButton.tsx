"use client";

import { useActionsContext } from "@/modules/common/components/Actions";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import {
  type Variant,
  type VariantExternalLink,
  type VariantTag,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaPen } from "react-icons/fa";

const UpdateVariantModal = dynamic(() =>
  import("./UpdateVariantModal").then((mod) => mod.UpdateVariantModal),
);

interface Props {
  readonly className?: string;
  readonly variant: Pick<
    Variant & { tags: VariantTag[]; externalLinks: VariantExternalLink[] },
    "id" | "tags" | "externalLinks"
  >;
}

export const UpdateVariantButton = ({ className, variant }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const actionsContext = useActionsContext();

  return (
    <div className={clsx(className, "flex justify-center")}>
      <Button variant="tertiary" onClick={() => setIsOpen(true)}>
        {isOpen ? <AsciiSpinner /> : <FaPen />} Bearbeiten
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
              actionsContext.setIsOpen(false);
            }}
            variant={variant}
          />
        </Suspense>
      )}
    </div>
  );
};
