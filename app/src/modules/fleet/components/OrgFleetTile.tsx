import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getOrgFleet } from "../queries/getOrgFleet";
import { FleetTable } from "./FleetTable";

const loadSearchParams = createLoader({
  flight_ready: parseAsStringLiteral(["all", "flight_ready"]).withDefault(
    "all",
  ),
  sort: parseAsStringLiteral([
    "name-asc",
    "name-desc",
    "count-asc",
    "count-desc",
  ]).withDefault("count-desc"),
  variantTags: parseAsArrayOf(parseAsString),
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const OrgFleetTile = async ({ className, searchParams }: Props) => {
  const { flight_ready, sort, variantTags, cursor, direction } =
    await loadSearchParams(searchParams);

  const { fleet, totalUsers, totalShips, nextCursor, prevCursor } =
    await getOrgFleet({
      flightReady: flight_ready,
      variantTagIds: variantTags?.length ? variantTags : [],
      sort,
      cursor,
      direction,
    });

  return (
    <section className={className}>
      <section className="flex flex-wrap gap-0.5 mb-0.5">
        <StatisticTile label="Schiffe" className="flex-1">
          <ScrambleIn
            text={totalShips.toLocaleString("de-de")}
            characters="1234567890."
          />
        </StatisticTile>

        <StatisticTile label="Citizen" className="flex-1">
          <ScrambleIn
            text={totalUsers.toLocaleString("de-de")}
            characters="1234567890."
          />
        </StatisticTile>
      </section>

      <div className="rounded-primary bg-neutral-800/50 p-4 overflow-x-auto">
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
