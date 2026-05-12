"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { MultiSelectComboboxFilter } from "@/modules/common/components/SidebarFilters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/SidebarFilters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/SidebarFilters/SingleSelectComboboxFilter";
import type { VariantTag } from "@prisma/client";
import clsx from "clsx";
import { useState } from "react";
import { FaFilter } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly variantTags: VariantTag[];
}

export const MyFleetFilters = ({ className, variantTags }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const tagItems = variantTags.map((tag) => ({
    value: tag.id,
    label: tag.value,
    group: tag.key,
  }));

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
          name="flight_ready"
          label="Flight ready"
          items={[
            { value: "all", label: "Alle", default: true },
            { value: "flight_ready", label: "Flight ready" },
          ]}
          resetCursorPagination
        />

        <MultiSelectComboboxFilter
          name="variantTags"
          label="Tags"
          items={tagItems}
          placeholder="Alle"
          resetCursorPagination
        />

        <SingleSelectComboboxFilter
          name="sort"
          label="Sortierung"
          items={[
            { value: "name-asc", label: "Name A – Z" },
            { value: "name-desc", label: "Name Z – A" },
          ]}
          resetCursorPagination
        />
      </div>
    </div>
  );
};
