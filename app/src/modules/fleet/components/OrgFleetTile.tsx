import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getOrgFleet } from "../queries";
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

  const { fleet, totalUsers, nextCursor, prevCursor } = await getOrgFleet({
    flightReady: flight_ready,
    variantTagIds: variantTags?.length ? variantTags : [],
    sort,
    cursor,
    direction,
  });

  return (
    <section className={className}>
      <p className="text-neutral-500 text-sm mb-1">{totalUsers} Citizen</p>

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
