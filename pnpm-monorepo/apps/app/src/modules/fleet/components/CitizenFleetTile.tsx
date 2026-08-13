import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { type SearchParams } from "nuqs/server";
import { getCitizenFleet } from "../queries/getCitizenFleet";
import { loadFleetListSearchParams } from "../utils/loadFleetListSearchParams";
import { ShipsTable } from "./ShipsTable";

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
  } = await loadFleetListSearchParams(searchParams);

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
            <ShipsTable ships={ships} />

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
