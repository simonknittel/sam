"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { MultiSelectComboboxFilter } from "@/modules/common/components/SidebarFilters/MultiSelectComboboxFilter";
import clsx from "clsx";
import { useState } from "react";
import { FaFilter } from "react-icons/fa";
import { AuditEventType } from "../utils/AuditEventTypes";

interface Creator {
  id: string;
  name: string | null;
}

interface Props {
  readonly className?: string;
  readonly creators: Creator[];
}

export const SystemLogFilters = ({ className, creators }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const typeItems = [
    ...Object.values(AuditEventType).map((type) => ({
      value: type,
      label: type,
    })),
  ];

  const creatorItems = [
    ...creators.map((creator) => ({
      value: creator.id,
      label: creator.name ?? creator.id,
    })),
  ];

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
        className={clsx("flex flex-col gap-0.5", {
          "hidden md:flex": !isOpen,
        })}
      >
        <MultiSelectComboboxFilter
          name="type"
          label="TYPE"
          items={typeItems}
          placeholder="Alle"
          resetCursorPagination
        />

        <MultiSelectComboboxFilter
          name="createdById"
          label="USER"
          items={creatorItems}
          placeholder="Alle"
          resetCursorPagination
        />
      </div>
    </div>
  );
};
