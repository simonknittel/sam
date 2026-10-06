import { filterCheckboxListParsers } from "@/modules/common/utils/filterCheckboxListParsers";
import { createLoader, createSerializer, parseAsStringEnum } from "nuqs/server";

/** The sort of the Spynet log tables (notes and other) */
export enum CitizenLogTableSort {
  ConfirmedAtAscending = "confirmed-at-asc",
  ConfirmedAtDescending = "confirmed-at-desc",
  CreatedAtAscending = "created-at-asc",
  CreatedAtDescending = "created-at-desc",
}

export const citizenLogTableParsers = {
  ...filterCheckboxListParsers,
  sort: parseAsStringEnum(Object.values(CitizenLogTableSort)).withDefault(
    CitizenLogTableSort.CreatedAtDescending,
  ),
};

export const loadCitizenLogTableSearchParams = createLoader(
  citizenLogTableParsers,
);

export const serializeCitizenLogTableSearchParams = createSerializer(
  citizenLogTableParsers,
);
