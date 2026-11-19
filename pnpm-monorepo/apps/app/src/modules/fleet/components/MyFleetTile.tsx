import { requireAuthenticationPage } from "@/modules/auth/server";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { Tile } from "@/modules/common/components/Tile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { forbidden } from "next/navigation";
import { type SearchParams } from "nuqs/server";
import { getMyFleet } from "../queries/getMyFleet";
import { loadFleetListSearchParams } from "../utils/loadFleetListSearchParams";
import { CreateShipButton } from "./CreateShipButton";
import { FleetValueTiles } from "./FleetValueTiles";
import { ShipsTable } from "./ShipsTable";

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const MyFleetTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthenticationPage();
  if (!(await authentication.authorize("ship", "manage"))) forbidden();

  const {
    flight_ready,
    acquisition_source,
    sort,
    variantTags,
    manufacturerIds,
    showDeleted,
    q,
    cursor,
    direction,
  } = await loadFleetListSearchParams(searchParams);

  const { ships, total, value, nextCursor, prevCursor } = await getMyFleet({
    flightReady: flight_ready,
    acquisitionSource: acquisition_source,
    variantTagIds: variantTags?.length ? variantTags : [],
    manufacturerIds: manufacturerIds?.length ? manufacturerIds : [],
    sort,
    showDeleted,
    searchQuery: q,
    cursor,
    direction,
  });

  return (
    <section className={className}>
      <section className="mb-0.5 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-0.5">
        <StatisticTile label="Schiffe">
          <ScrambleIn
            text={total.toLocaleString("de-de")}
            characters="1234567890."
          />
        </StatisticTile>

        <FleetValueTiles value={value} />
      </section>

      <Tile heading="Meine Schiffe" cta={<CreateShipButton />}>
        {ships.length === 0 ? (
          <p className="italic">Keine Schiffe gefunden.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <ShipsTable ships={ships} editable />

            <CursorPaginationControls
              nextCursor={nextCursor}
              prevCursor={prevCursor}
            />
          </div>
        )}
      </Tile>
    </section>
  );
};
