import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  listOrgFleet,
  OrgFleetSort,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import { cache } from "react";
import {
  toAcquisitionSourceFilter,
  toFleetValue,
  toFlightReadyFilter,
  toShipVariant,
} from "../utils/fleetListMapping";
import {
  AcquisitionSourceParameter,
  FleetSortParameter,
  FlightReadyParameter,
} from "../utils/fleetSearchParameters";
import { FLEET_PAGE_SIZE } from "./shipQuery";

const toOrgFleetSort = (sort: FleetSortParameter) => {
  switch (sort) {
    case FleetSortParameter.NameAscending:
      return OrgFleetSort.NameAscending;

    case FleetSortParameter.NameDescending:
      return OrgFleetSort.NameDescending;

    case FleetSortParameter.CountAscending:
      return OrgFleetSort.CountAscending;

    case FleetSortParameter.CountDescending:
      return OrgFleetSort.CountDescending;

    default:
      throw new Error(`Unknown sort: ${sort satisfies never}`);
  }
};

interface OrgFleetOptions {
  readonly flightReady?: FlightReadyParameter;
  readonly acquisitionSource?: AcquisitionSourceParameter;
  readonly variantTagIds?: string[];
  readonly manufacturerIds?: string[];
  readonly sort?: FleetSortParameter;
  readonly searchQuery?: string | null;
  readonly cursor?: string | null;
  readonly direction?: CursorDirection;
}

export const getOrgFleet = cache(
  withTrace(
    "getOrgFleet",
    async ({
      flightReady = FlightReadyParameter.All,
      acquisitionSource = AcquisitionSourceParameter.All,
      variantTagIds = [],
      manufacturerIds = [],
      sort = FleetSortParameter.CountDescending,
      searchQuery,
      cursor,
      direction = CursorDirection.Next,
    }: OrgFleetOptions) => {
      try {
        const output = await listOrgFleet(
          getApplicationContext(),
          await getRequestActor(),
          {
            flight_ready: toFlightReadyFilter(flightReady),
            acquisition_source: toAcquisitionSourceFilter(acquisitionSource),
            variant_tag_ids: variantTagIds,
            manufacturer_ids: manufacturerIds,
            query: searchQuery || undefined,
            sort: toOrgFleetSort(sort),
            limit: FLEET_PAGE_SIZE,
            cursor: cursor ?? undefined,
          },
          { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
        );

        return {
          fleet: output.fleet.map((entry) => ({
            variant: toShipVariant(entry.variant),
            count: entry.count,
          })),
          totalCitizens: output.total_citizens,
          totalShips: output.total_ships,
          value: toFleetValue(output.value),
          nextCursor: output.next_cursor,
          prevCursor: output.previous_cursor,
        };
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);
