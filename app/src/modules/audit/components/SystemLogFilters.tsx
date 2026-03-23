"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { RadioFilter } from "@/modules/common/components/SidebarFilters/RadioFilter";
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
    { value: "", label: "Alle", default: true },
    ...Object.values(AuditEventType).map((type) => ({
      value: type,
      label: type,
    })),
  ];

  const creatorItems = [
    { value: "", label: "Alle", default: true },
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
        className={clsx("flex flex-col gap-[2px]", {
          "hidden md:flex": !isOpen,
        })}
      >
        <RadioFilter
          name="type"
          label="Typ"
          items={typeItems}
          resetCursorPagination
        />

        <RadioFilter
          name="createdById"
          label="Erstellt von"
          items={creatorItems}
          resetCursorPagination
        />
      </div>
    </div>
  );
};
