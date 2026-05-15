"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { RadioFilter } from "@/modules/common/components/SidebarFilters/RadioFilter";
import clsx from "clsx";
import { useState } from "react";
import { FaFilter } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const ShipChangesFilters = ({ className }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx("flex flex-col gap-0.5", className)}>
      <Button2
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        variant={Button2Variant.Secondary}
        className="w-full md:hidden"
      >
        <FaFilter />
        Filter
      </Button2>

      <div
        className={clsx("flex flex-col gap-0.5", {
          "hidden md:flex": !isOpen,
        })}
      >
        <RadioFilter
          name="changeType"
          label="Typ"
          items={[
            { value: "both", label: "Alle", default: true },
            { value: "creation", label: "Erstellt" },
            { value: "deletion", label: "Gelöscht" },
          ]}
          resetCursorPagination
        />
      </div>
    </div>
  );
};
