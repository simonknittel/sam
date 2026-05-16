import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getCitizenFleet } from "../queries/getCitizenFleet";
import { CitizenFleetTable } from "./CitizenFleetTable";

const loadSearchParams = createLoader({
  flight_ready: parseAsStringLiteral(["all", "flight_ready"]).withDefault(
    "all",
  ),
  sort: parseAsStringLiteral(["name-asc", "name-desc"]).withDefault("name-asc"),
  variantTags: parseAsArrayOf(parseAsString),
  manufacturerIds: parseAsArrayOf(parseAsString),
  showDeleted: parseAsStringLiteral(["all", "deleted"]).withDefault("all"),
  q: parseAsString,
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly citizenId: string;
  readonly searchParams: Promise<SearchParams>;
}

export const CitizenFleetTile = async ({
  className,
  citizenId,
  searchParams,
}: Props) => {
  const {
    flight_ready,
    sort,
    variantTags,
    manufacturerIds,
    showDeleted,
    q,
    cursor,
    direction,
  } = await loadSearchParams(searchParams);

  const { ships, total, nextCursor, prevCursor } = await getCitizenFleet(
    citizenId,
    {
      flightReady: flight_ready,
      variantTagIds: variantTags?.length ? variantTags : [],
      manufacturerIds: manufacturerIds?.length ? manufacturerIds : [],
      sort,
      showDeleted,
      searchQuery: q,
      cursor,
      direction,
    },
  );

  return (
    <section className={className}>
      <StatisticTile label="Schiffe" className="flex-1">
        <ScrambleIn
          text={total.toLocaleString("de-de")}
          characters="1234567890."
        />
      </StatisticTile>

      <div className="rounded-primary bg-neutral-800/50 p-4 overflow-x-auto mt-0.5">
        {ships.length === 0 ? (
          <div className="grid place-content-center">
            <p className="text-white/90">Keine Schiffe gefunden</p>
          </div>
        ) : (
          <>
            <CitizenFleetTable ships={ships} />

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
