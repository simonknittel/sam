import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import {
  CITIZEN_LOG_TABLE_CLASSIFICATION_LEVEL_PARAM,
  CITIZEN_LOG_TABLE_NOTE_TYPE_PARAM,
} from "@/modules/citizen/utils/citizenLogTableSearchParams";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { findNoteTableFilterOptions } from "@sam-monorepo/application";
import { CitizenLogTableFilters } from "./CitizenLogTableFilters";

/** Only the values that at least one visible note has */
const toItems = (
  entries: readonly { readonly id: string; readonly name: string }[],
  visibleIds: readonly string[],
) => {
  const visibleIdSet = new Set(visibleIds);

  return entries
    .filter((entry) => visibleIdSet.has(entry.id))
    .map((entry) => ({ value: entry.id, label: entry.name }));
};

export const NotesTableFilters = async () => {
  const [options, noteTypes, classificationLevels] = await Promise.all([
    findNoteTableFilterOptions(
      getApplicationContext(),
      await getRequestActor(),
    ),
    getAllNoteTypes(),
    getAllClassificationLevels(),
  ]).catch(throwApplicationErrorForPage);

  const noteTypeItems = toItems(noteTypes, options.noteTypeIds);
  const classificationLevelItems = toItems(
    classificationLevels,
    options.classificationLevelIds,
  );

  return (
    <>
      {noteTypeItems.length > 0 && (
        <MultiSelectComboboxFilter
          name={CITIZEN_LOG_TABLE_NOTE_TYPE_PARAM}
          label="Notizart"
          items={noteTypeItems}
          resetCursorPagination
        />
      )}

      {classificationLevelItems.length > 0 && (
        <MultiSelectComboboxFilter
          name={CITIZEN_LOG_TABLE_CLASSIFICATION_LEVEL_PARAM}
          label="Geheimhaltungsstufe"
          items={classificationLevelItems}
          resetCursorPagination
        />
      )}

      <CitizenLogTableFilters confirmationStates={options.confirmationStates} />
    </>
  );
};
