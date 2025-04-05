import { Filter } from "@/spynet/components/Filter";
import { type NoteType } from "@prisma/client";
import { ClassificationLevelFilter } from "./ClassificationLevelFilter";
import { ConfirmationStateFilter } from "./ConfirmationStateFilter";
import { NoteTypeFilter } from "./NoteTypeFilter";
import { type Row } from "./NotesTable";

type Props = Readonly<{
  rows: Row[];
}>;

export const NotesTableFilters = ({ rows }: Props) => {
  const noteTypes = new Map<string, NoteType>();
  const classificationLevels = new Map<string, NoteType>();
  const confirmationStates = new Set<string>();

  for (const row of rows) {
    if (!noteTypes.has(row.noteType.id)) {
      noteTypes.set(row.noteType.id, row.noteType);
    }

    if (!classificationLevels.has(row.classificationLevel.id)) {
      classificationLevels.set(
        row.classificationLevel.id,
        row.classificationLevel,
      );
    }

    if (row.confirmationState) {
      confirmationStates.add(row.confirmationState);
    } else {
      confirmationStates.add("unconfirmed");
    }
  }

  return (
    <div className="flex gap-2 items-center">
      {noteTypes.size > 0 && (
        <Filter name="Notizarten">
          <NoteTypeFilter noteTypes={Array.from(noteTypes.values())} />
        </Filter>
      )}

      {classificationLevels.size > 0 && (
        <Filter name="Geheimhaltungsstufen">
          <ClassificationLevelFilter
            classificationLevels={Array.from(classificationLevels.values())}
          />
        </Filter>
      )}

      {confirmationStates.size > 0 && (
        <Filter name="Bestätigungsstatus">
          <ConfirmationStateFilter
            confirmationStates={Array.from(confirmationStates)}
          />
        </Filter>
      )}
    </div>
  );
};
