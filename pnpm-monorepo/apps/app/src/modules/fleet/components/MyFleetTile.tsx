import { requireAuthentication } from "@/modules/auth/server";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { forbidden } from "next/navigation";
import { type SearchParams } from "nuqs/server";
import { getMyFleet } from "../queries/getMyFleet";
import { getVariantCatalog } from "../queries/getVariantCatalog";
import { loadFleetListSearchParams } from "../utils/loadFleetListSearchParams";
import { AssignShip } from "./AssignShip";
import { ShipsTable } from "./ShipsTable";

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const MyFleetTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("ship", "manage"))) forbidden();

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

  const [{ ships, total, nextCursor, prevCursor }, allVariants] =
    await Promise.all([
      getMyFleet({
        flightReady: flight_ready,
        variantTagIds: variantTags?.length ? variantTags : [],
        manufacturerIds: manufacturerIds?.length ? manufacturerIds : [],
        sort,
        showDeleted,
        searchQuery: q,
        cursor,
        direction,
      }),
      getVariantCatalog(),
    ]);

  return (
    <section className={className}>
      <div className="mb-1 flex items-center gap-4">
        <p className="text-sm text-neutral-500">Anzahl: {total}</p>

        <AssignShip data={allVariants} />
      </div>

      <div className="mt-2 overflow-x-auto rounded-primary bg-neutral-800/50 p-4">
        {ships.length === 0 ? (
          <div className="grid place-content-center">
            <p className="text-white/90">Keine Schiffe gefunden</p>
          </div>
        ) : (
          <>
            <ShipsTable ships={ships} editable />

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
