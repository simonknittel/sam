"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { filterCheckboxListParsers } from "@/modules/common/utils/filterCheckboxListParsers";
import clsx from "clsx";
import { useQueryStates } from "nuqs";
import type { ChangeEventHandler, ReactNode } from "react";

interface FilterCheckboxItem {
  readonly id: string;
  readonly label: ReactNode;
}

interface Props {
  readonly className?: string;
  /**
   * Namespace of this list's entries inside the shared `filters` search
   * parameter, e.g. "note-type"
   */
  readonly prefix: string;
  readonly items: FilterCheckboxItem[];
}

/**
 * A checkbox list writing its selection into the citizen tables' shared
 * `filters` URL parameter, namespaced by prefix.
 */
export const FilterCheckboxList = ({ className, prefix, items }: Props) => {
  const [{ filters }, setSearchParams] = useQueryStates(
    filterCheckboxListParsers,
    { shallow: false, history: "push" },
  );

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const { checked, value } = event.target;

    void setSearchParams((current) => ({
      filters: checked
        ? [...current.filters, value]
        : current.filters.filter((filter) => filter !== value),
      page: null,
    }));
  };

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex w-full items-center justify-between gap-4"
        >
          <label
            className="flex cursor-pointer items-center gap-2 whitespace-nowrap"
            htmlFor={`${prefix}-${item.id}`}
          >
            {item.label}
          </label>

          <YesNoCheckbox
            id={`${prefix}-${item.id}`}
            value={`${prefix}-${item.id}`}
            onChange={handleChange}
            checked={filters.includes(`${prefix}-${item.id}`)}
            hideLabel
          />
        </div>
      ))}
    </div>
  );
};
