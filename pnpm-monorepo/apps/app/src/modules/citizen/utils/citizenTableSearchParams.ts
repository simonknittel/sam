import { filterCheckboxListParsers } from "@/modules/common/utils/filterCheckboxListParsers";
import { createLoader, createSerializer, parseAsStringEnum } from "nuqs/server";

export enum CitizenTableSort {
  HandleAscending = "handle-asc",
  HandleDescending = "handle-desc",
  CreatedAtAscending = "created-at-asc",
  CreatedAtDescending = "created-at-desc",
  LastSeenAtAscending = "last-seen-at-asc",
  LastSeenAtDescending = "last-seen-at-desc",
}

export const citizenTableParsers = {
  ...filterCheckboxListParsers,
  sort: parseAsStringEnum(Object.values(CitizenTableSort)).withDefault(
    CitizenTableSort.CreatedAtDescending,
  ),
};

export const loadCitizenTableSearchParams = createLoader(citizenTableParsers);

export const serializeCitizenTableSearchParams =
  createSerializer(citizenTableParsers);
