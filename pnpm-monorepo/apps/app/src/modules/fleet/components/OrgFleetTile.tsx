import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  type SearchParams,
} from "nuqs/server";
import { getOrgFleet } from "../queries/getOrgFleet";
import {
  AcquisitionSourceParameter,
  FleetSortParameter,
  FlightReadyParameter,
} from "../utils/fleetSearchParameters";
import { FleetTable } from "./FleetTable";
import { FleetValueTiles } from "./FleetValueTiles";

const loadSearchParams = createCursorPaginationLoader({
  flight_ready: parseAsStringEnum(
    Object.values(FlightReadyParameter),
  ).withDefault(FlightReadyParameter.All),
  acquisition_source: parseAsStringEnum(
    Object.values(AcquisitionSourceParameter),
  ).withDefault(AcquisitionSourceParameter.All),
  sort: parseAsStringEnum(Object.values(FleetSortParameter)).withDefault(
    FleetSortParameter.CountDescending,
  ),
  variantTags: parseAsArrayOf(parseAsString),
  manufacturerIds: parseAsArrayOf(parseAsString),
  q: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const OrgFleetTile = async ({ className, searchParams }: Props) => {
  const {
    flight_ready,
    acquisition_source,
    sort,
    variantTags,
    manufacturerIds,
    q,
    cursor,
    direction,
  } = await loadSearchParams(searchParams);

  const { fleet, totalCitizens, totalShips, value, nextCursor, prevCursor } =
    await getOrgFleet({
      flightReady: flight_ready,
      acquisitionSource: acquisition_source,
      variantTagIds: variantTags?.length ? variantTags : [],
      manufacturerIds: manufacturerIds?.length ? manufacturerIds : [],
      sort,
      searchQuery: q,
      cursor,
      direction,
    });

  return (
    <section
      className={className}
      data-onboarding-target={OnboardingTargetId.OrgFleet}
    >
      <section className="mb-0.5 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-0.5">
        <StatisticTile label="Schiffe">
          <ScrambleIn
            text={totalShips.toLocaleString("de-de")}
            characters="1234567890."
          />
        </StatisticTile>

        <StatisticTile label="Citizen">
          <ScrambleIn
            text={totalCitizens.toLocaleString("de-de")}
            characters="1234567890."
          />
        </StatisticTile>

        <FleetValueTiles value={value} />
      </section>

      <div className="overflow-x-auto rounded-primary bg-neutral-800/50 p-4">
        {fleet.length === 0 ? (
          <div className="grid place-content-center">
            <p className="text-white/90">Keine Schiffe gefunden</p>
          </div>
        ) : (
          <>
            <FleetTable fleet={fleet} />

            <CursorPaginationControls
              nextCursor={nextCursor}
              prevCursor={prevCursor}
              className="mt-4"
            />
          </>
        )}
      </div>
    </section>
  );
};
