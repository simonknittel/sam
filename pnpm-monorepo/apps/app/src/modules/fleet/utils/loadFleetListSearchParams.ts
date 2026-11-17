import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { parseAsArrayOf, parseAsString, parseAsStringEnum } from "nuqs/server";
import {
  AcquisitionSourceParameter,
  FleetSortParameter,
  FlightReadyParameter,
  SHIP_SORT_PARAMETERS,
  ShowDeletedParameter,
} from "./fleetSearchParameters";

/** The URL filter contract shared by the my-ships and citizen fleet lists */
export const loadFleetListSearchParams = createCursorPaginationLoader({
  flight_ready: parseAsStringEnum(
    Object.values(FlightReadyParameter),
  ).withDefault(FlightReadyParameter.All),
  sort: parseAsStringEnum([...SHIP_SORT_PARAMETERS]).withDefault(
    FleetSortParameter.NameAscending,
  ),
  acquisition_source: parseAsStringEnum(
    Object.values(AcquisitionSourceParameter),
  ).withDefault(AcquisitionSourceParameter.All),
  variantTags: parseAsArrayOf(parseAsString),
  manufacturerIds: parseAsArrayOf(parseAsString),
  showDeleted: parseAsStringEnum(
    Object.values(ShowDeletedParameter),
  ).withDefault(ShowDeletedParameter.All),
  q: parseAsString,
});
