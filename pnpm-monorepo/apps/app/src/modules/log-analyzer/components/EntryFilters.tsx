"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { FaFilter } from "react-icons/fa";
import { PATTERNS, SORTED_ENTRY_TYPES } from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

export const EntryFilters = ({ className }: Props) => {
  const { entryFilters, setEntryFilters } = useLogAnalyzerContext();

  return (
    <PopoverBaseUI
      title="Filter"
      trigger={
        <>
          <FaFilter />
          Filter
        </>
      }
      triggerRender={<Button2 variant={Button2Variant.Secondary} />}
      triggerClassName={className}
      childrenClassName="flex flex-col gap-1 w-80"
      openOnHover={false}
    >
      {SORTED_ENTRY_TYPES.map((type) => {
        const { title, icon: Icon } = PATTERNS[type];

        const label = (
          <span className="flex items-center gap-2">
            <Icon className="shrink-0" />
            {title}
          </span>
        );

        return (
          <YesNoCheckbox
            key={type}
            yesLabel={label}
            noLabel={label}
            labelClassName="text-sm flex-1"
            checked={!entryFilters[type]}
            onChange={(event) => setEntryFilters(type, !event.target.checked)}
          />
        );
      })}
    </PopoverBaseUI>
  );
};
