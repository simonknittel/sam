"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import type { EntityLogType } from "@/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEventHandler } from "react";

interface Props {
  readonly entityLogTypes: Map<EntityLogType, string>;
}

export const EntityLogTypeFilter = ({ entityLogTypes }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultValues =
    searchParams
      .get("filters")
      ?.split(",")
      .filter((filter) => filter.startsWith("type-")) || [];

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
    <div className="flex flex-col items-start gap-2 px-4 py-2 rounded-secondary bg-neutral-800">
      {Array.from(entityLogTypes)
        .toSorted((a, b) => a[1].localeCompare(b[1]))
        .map(([type, translation]) => (
          <div
            key={type}
            className="flex justify-between items-center w-full gap-4"
          >
            <label className="flex gap-2 items-center whitespace-nowrap">
              {translation}
            </label>

            <YesNoCheckbox
              id={type}
              value={`type-${type}`}
              onChange={handleChange}
              defaultChecked={defaultValues.includes(`type-${type}`)}
              hideLabel
            />
          </div>
        ))}
    </div>
  );
};
