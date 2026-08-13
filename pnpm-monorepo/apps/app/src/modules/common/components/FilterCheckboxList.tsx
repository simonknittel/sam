"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEventHandler, ReactNode } from "react";

interface FilterCheckboxItem {
  readonly id: string;
  readonly label: ReactNode;
}

interface Props {
  readonly className?: string;
  /**
   * Namespace of this list's entries inside the shared comma-joined
   * `filters` query param, e.g. "note-type". The URL format predates the
   * common nuqs filters and is kept for bookmark compatibility.
   */
  readonly prefix: string;
  readonly items: FilterCheckboxItem[];
}

/**
 * A checkbox list writing its selection into the citizen tables' shared
 * `filters` URL parameter, namespaced by prefix.
 */
export const FilterCheckboxList = ({ className, prefix, items }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultValues =
    searchParams
      .get("filters")
      ?.split(",")
      .filter((filter) => filter.startsWith(`${prefix}-`)) || [];

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const newSearchParams = new URLSearchParams(window.location.search);

    let filters = newSearchParams.get("filters")?.split(",") || [];

    if (event.target.checked) {
      filters.push(event.target.value);
    } else {
      filters = filters.filter((filter) => filter !== event.target.value);
    }

    newSearchParams.set("filters", filters.join(","));

    router.push(`${pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex justify-between items-center w-full gap-4"
        >
          <label
            className="flex gap-2 items-center whitespace-nowrap cursor-pointer"
            htmlFor={`${prefix}-${item.id}`}
          >
            {item.label}
          </label>

          <YesNoCheckbox
            id={`${prefix}-${item.id}`}
            value={`${prefix}-${item.id}`}
            onChange={handleChange}
            defaultChecked={defaultValues.includes(`${prefix}-${item.id}`)}
            hideLabel
          />
        </div>
      ))}
    </div>
  );
};
