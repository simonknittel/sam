"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { SingleSelectComboboxFilter } from "@/modules/common/components/SidebarFilters/SingleSelectComboboxFilter";
import clsx from "clsx";
import { useState } from "react";
import { FaFilter } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const RolesFilters = ({ className }: Props) => {
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
        <SingleSelectComboboxFilter
          name="filter"
          label="Filter"
          items={[
            { value: "all", label: "Alle" },
            { value: "has-inheritance", label: "Vererbungen" },
            { value: "has-level", label: "Level" },
            { value: "has-citizen", label: "Citizen" },
            { value: "no-citizen", label: "Keine Citizen" },
          ]}
        />

        <SingleSelectComboboxFilter
          name="sort"
          label="Sortierung"
          items={[
            { value: "name-asc", label: "Name A – Z" },
            { value: "name-desc", label: "Name Z – A" },
            { value: "inherits-desc", label: "Anzahl Vererbungen ↓" },
            { value: "inherits-asc", label: "Anzahl Vererbungen ↑" },
            { value: "citizen-desc", label: "Anzahl Citizen ↓" },
            { value: "citizen-asc", label: "Anzahl Citizen ↑" },
          ]}
        />
      </div>
    </div>
  );
};
