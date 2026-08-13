"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import { type ClassificationLevel } from "@sam-monorepo/database/browser";

interface Props {
  readonly classificationLevels: ClassificationLevel[];
}

export const ClassificationLevelFilter = ({ classificationLevels }: Props) => {
  return (
    <FilterCheckboxList
      className="items-start max-h-96 overflow-auto"
      prefix="classification-level"
      items={classificationLevels.map((classificationLevel) => ({
        id: classificationLevel.id,
        label: classificationLevel.name,
      }))}
    />
  );
};
