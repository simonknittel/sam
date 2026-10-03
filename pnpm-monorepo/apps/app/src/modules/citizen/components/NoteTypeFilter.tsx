"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import { type NoteType } from "@sam-monorepo/database/browser";

interface Props {
  readonly noteTypes: NoteType[];
}

export const NoteTypeFilter = ({ noteTypes }: Props) => {
  return (
    <FilterCheckboxList
      className="max-h-96 items-start overflow-auto"
      prefix="note-type"
      items={noteTypes.map((noteType) => ({
        id: noteType.id,
        label: noteType.name,
      }))}
    />
  );
};
