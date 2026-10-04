"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import {
  filterCheckboxListParsers,
  getFilterValue,
} from "@/modules/common/utils/filterCheckboxListParsers";
import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import { useQueryStates } from "nuqs";
import {
  useEffect,
  useTransition,
  type ChangeEventHandler,
  type ReactNode,
} from "react";

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
  const [isLoading, startTransition] = useTransition();

  const [{ filters }, setSearchParams] = useQueryStates(
    filterCheckboxListParsers,
    { shallow: false, history: "push", startTransition },
  );

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

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
      {items.map((item) => {
        const value = getFilterValue(prefix, item.id);

        return (
          <div
            key={item.id}
            className="flex w-full items-center justify-between gap-4"
          >
            <label
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap"
              htmlFor={value}
            >
              {item.label}
            </label>

            <YesNoCheckbox
              id={value}
              value={value}
              onChange={handleChange}
              checked={filters.includes(value)}
              hideLabel
            />
          </div>
        );
      })}
    </div>
  );
};
