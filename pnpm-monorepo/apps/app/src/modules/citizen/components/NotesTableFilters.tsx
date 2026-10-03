import { Filter } from "@/modules/common/components/Filter";
import {
  type ConfirmationStatus,
  type NoteType,
} from "@sam-monorepo/database/client";
import { ClassificationLevelFilter } from "./ClassificationLevelFilter";
import { ConfirmationStateFilter } from "./ConfirmationStateFilter";
import { NoteTypeFilter } from "./NoteTypeFilter";

interface Props {
  readonly noteTypes: readonly NoteType[];
  readonly classificationLevels: readonly NoteType[];
  readonly confirmationStates: readonly (ConfirmationStatus | null)[];
}

export const NotesTableFilters = ({
  noteTypes,
  classificationLevels,
  confirmationStates,
}: Props) => {
  return (
    <div className="flex items-center gap-2">
      {noteTypes.length > 0 && (
        <Filter name="Notizarten">
          <NoteTypeFilter noteTypes={[...noteTypes]} />
        </Filter>
      )}

      {classificationLevels.length > 0 && (
        <Filter name="Geheimhaltungsstufen">
          <ClassificationLevelFilter
            classificationLevels={[...classificationLevels]}
          />
        </Filter>
      )}

      {confirmationStates.length > 0 && (
        <Filter name="Bestätigungsstatus">
          <ConfirmationStateFilter confirmationStates={confirmationStates} />
        </Filter>
      )}
    </div>
  );
};
