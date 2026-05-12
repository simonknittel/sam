"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { SingleSelectComboboxFilter } from "@/modules/common/components/SidebarFilters/SingleSelectComboboxFilter";
import clsx from "clsx";
import { useState } from "react";
import { FaFilter } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const UsersFilters = ({ className }: Props) => {
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
          name="sort"
          label="Sortierung"
          items={[
            { value: "createdAt-desc", label: "Registriert am ↓" },
            { value: "createdAt-asc", label: "Registriert am ↑" },
            { value: "emailVerified-desc", label: "Datenschutzerklärung ↓" },
            { value: "emailVerified-asc", label: "Datenschutzerklärung ↑" },
            { value: "name-asc", label: "Handle A – Z" },
            { value: "name-desc", label: "Handle Z – A" },
          ]}
        />
      </div>
    </div>
  );
};
