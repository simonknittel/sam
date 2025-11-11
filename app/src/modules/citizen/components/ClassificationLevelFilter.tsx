"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { type ClassificationLevel } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEventHandler } from "react";

interface Props {
  readonly classificationLevels: ClassificationLevel[];
}

export const ClassificationLevelFilter = ({ classificationLevels }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultValues =
    searchParams
      .get("filters")
      ?.split(",")
      .filter((filter) => filter.startsWith("classification-level-")) || [];

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
    <div className="flex flex-col items-start gap-2 px-4 py-2 rounded-secondary bg-neutral-800 max-h-96 overflow-auto">
      {classificationLevels.map((noteType) => (
        <div
          key={noteType.id}
          className="flex justify-between items-center w-full gap-4"
        >
          <label className="flex gap-2 items-center whitespace-nowrap">
            {noteType.name}
          </label>

          <YesNoCheckbox
            id={noteType.id}
            value={`classification-level-${noteType.id}`}
            onChange={handleChange}
            defaultChecked={defaultValues.includes(
              `classification-level-${noteType.id}`,
            )}
            hideLabel
          />
        </div>
      ))}
    </div>
  );
};
