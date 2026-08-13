"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import { type NoteType } from "@sam-monorepo/database/browser";

interface Props {
  readonly noteTypes: NoteType[];
}

export const NoteTypeFilter = ({ noteTypes }: Props) => {
  return (
    <FilterCheckboxList
      className="items-start max-h-96 overflow-auto"
      prefix="note-type"
      items={noteTypes.map((noteType) => ({
        id: noteType.id,
        label: noteType.name,
      }))}
    />
  );
};
