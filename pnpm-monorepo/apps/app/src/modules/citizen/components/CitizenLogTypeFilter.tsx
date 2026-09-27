"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import type { CitizenLogType } from "@/types";

interface Props {
  readonly citizenLogTypes: Map<CitizenLogType, string>;
}

export const CitizenLogTypeFilter = ({ citizenLogTypes }: Props) => {
  return (
    <FilterCheckboxList
      className="items-start"
      prefix="type"
      items={Array.from(citizenLogTypes)
        .toSorted((firstEntry, secondEntry) =>
          firstEntry[1].localeCompare(secondEntry[1]),
        )
        .map(([type, translation]) => ({
          id: type,
          label: translation,
        }))}
    />
  );
};
