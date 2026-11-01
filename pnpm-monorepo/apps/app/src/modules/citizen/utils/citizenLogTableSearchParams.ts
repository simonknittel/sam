import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { CitizenLogTableSort } from "@sam-monorepo/domain";
import { parseAsArrayOf, parseAsString, parseAsStringEnum } from "nuqs/server";

export const CITIZEN_LOG_TABLE_DEFAULT_SORT =
  CitizenLogTableSort.CreatedAtDescending;

/**
 * The search params of the filter sidebars of the Spynet log tables. The
 * notes table uses the note type and the classification level, the table of
 * the other logs uses the type.
 */
export const CITIZEN_LOG_TABLE_NOTE_TYPE_PARAM = "note_type";
export const CITIZEN_LOG_TABLE_CLASSIFICATION_LEVEL_PARAM =
  "classification_level";
export const CITIZEN_LOG_TABLE_TYPE_PARAM = "type";
export const CITIZEN_LOG_TABLE_CONFIRMATION_PARAM = "confirmation";

export const citizenLogTableParsers = {
  [CITIZEN_LOG_TABLE_NOTE_TYPE_PARAM]: parseAsArrayOf(
    parseAsString,
  ).withDefault([]),
  [CITIZEN_LOG_TABLE_CLASSIFICATION_LEVEL_PARAM]: parseAsArrayOf(
    parseAsString,
  ).withDefault([]),
  [CITIZEN_LOG_TABLE_TYPE_PARAM]: parseAsArrayOf(parseAsString).withDefault([]),
  [CITIZEN_LOG_TABLE_CONFIRMATION_PARAM]: parseAsArrayOf(
    parseAsString,
  ).withDefault([]),
  sort: parseAsStringEnum(Object.values(CitizenLogTableSort)).withDefault(
    CITIZEN_LOG_TABLE_DEFAULT_SORT,
  ),
};

export const loadCitizenLogTableSearchParams = createCursorPaginationLoader(
  citizenLogTableParsers,
);

/**
 * How many values one filter may give to a query. The lists come from the
 * URL, thus without a limit anyone could give the database an `IN` of any
 * length.
 */
const MAXIMUM_FILTER_VALUES = 100;

export const limitFilterValues = (values: readonly string[]) =>
  values.slice(0, MAXIMUM_FILTER_VALUES);
