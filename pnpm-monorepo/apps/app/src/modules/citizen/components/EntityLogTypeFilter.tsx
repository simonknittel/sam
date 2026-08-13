"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import type { EntityLogType } from "@/types";

interface Props {
  readonly entityLogTypes: Map<EntityLogType, string>;
}

export const EntityLogTypeFilter = ({ entityLogTypes }: Props) => {
  return (
    <FilterCheckboxList
      className="items-start"
      prefix="type"
      items={Array.from(entityLogTypes)
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
