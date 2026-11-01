import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import {
  createSerializer,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export enum CitizenTableSort {
  HandleAscending = "handle-asc",
  HandleDescending = "handle-desc",
  CreatedAtAscending = "created-at-asc",
  CreatedAtDescending = "created-at-desc",
  LastSeenAtAscending = "last-seen-at-asc",
  LastSeenAtDescending = "last-seen-at-desc",
}

export const CITIZEN_TABLE_DEFAULT_SORT = CitizenTableSort.CreatedAtDescending;

/** The search params of the filter sidebar of the citizen table */
export const CITIZEN_TABLE_UNKNOWN_PARAM = "unknown";
export const CITIZEN_TABLE_ROLE_PARAM = "role";

export const citizenTableParsers = {
  [CITIZEN_TABLE_UNKNOWN_PARAM]: parseAsArrayOf(parseAsString).withDefault([]),
  [CITIZEN_TABLE_ROLE_PARAM]: parseAsArrayOf(parseAsString).withDefault([]),
  sort: parseAsStringEnum(Object.values(CitizenTableSort)).withDefault(
    CITIZEN_TABLE_DEFAULT_SORT,
  ),
};

export const loadCitizenTableSearchParams =
  createCursorPaginationLoader(citizenTableParsers);

export const serializeCitizenTableSearchParams =
  createSerializer(citizenTableParsers);
