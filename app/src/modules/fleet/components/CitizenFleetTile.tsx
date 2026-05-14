import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getCitizenFleet } from "../queries";
import { CitizenFleetTable } from "./CitizenFleetTable";

const loadSearchParams = createLoader({
  flight_ready: parseAsStringLiteral(["all", "flight_ready"]).withDefault(
    "all",
  ),
  sort: parseAsStringLiteral(["name-asc", "name-desc"]).withDefault("name-asc"),
  variantTags: parseAsArrayOf(parseAsString),
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
  const { flight_ready, sort, variantTags, cursor, direction } =
    await loadSearchParams(searchParams);

  const { ships, total, nextCursor, prevCursor } = await getCitizenFleet(
    citizenId,
    {
      flightReady: flight_ready,
      variantTagIds: variantTags?.length ? variantTags : [],
      sort,
      cursor,
      direction,
    },
  );

  return (
    <section className={className}>
      <p className="text-neutral-500 text-sm mb-1">Anzahl: {total}</p>

      <div className="rounded-primary bg-neutral-800/50 p-4 overflow-x-auto">
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
