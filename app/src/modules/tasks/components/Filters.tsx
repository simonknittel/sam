"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { RadioFilter } from "@/modules/common/components/SidebarFilters/RadioFilter";
import clsx from "clsx";
import { useState } from "react";
import { FaFilter } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const Filters = ({ className }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx(className)}>
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
        className={clsx("flex flex-col gap-[2px]", {
          "hidden md:flex": !isOpen,
        })}
      >
        <RadioFilter
          name="status"
          label="Status"
          items={[
            { value: "open", label: "Offen", default: true },
            { value: "closed", label: "Geschlossen" },
          ]}
        />

        <RadioFilter
          name="accepted"
          label="Angenommen von"
          items={[
            { value: "all", label: "Alle", default: true },
            { value: "yes", label: "Mir" },
          ]}
        />

        <RadioFilter
          name="created_by"
          label="Erstellt von"
          items={[
            { value: "others", label: "Alle", default: true },
            { value: "me", label: "Mir" },
          ]}
        />
      </div>
    </div>
  );
};
