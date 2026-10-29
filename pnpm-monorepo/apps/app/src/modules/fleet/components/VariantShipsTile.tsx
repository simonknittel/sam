import { Tile } from "@/modules/common/components/Tile";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { type SearchParams } from "nuqs/server";
import { getVariantShips } from "../queries/getVariantShips";
import type { VariantDetail } from "./VariantDetailHeader";
import { VariantShipsTable } from "./VariantShipsTable";

const loadSearchParams = createCursorPaginationLoader({});

interface Props {
  readonly className?: string;
  readonly variant: VariantDetail;
  readonly searchParams: Promise<SearchParams>;
}

export const VariantShipsTile = async ({
  className,
  variant,
  searchParams,
}: Props) => {
  const { cursor, direction } = await loadSearchParams(searchParams);
  const { ships, nextCursor, prevCursor } = await getVariantShips(variant.id, {
    cursor,
    direction,
  });

  return (
    <Tile heading="Einzelschiffe" className={className}>
      {ships.length === 0 ? (
        <p className="text-center text-white/90">Keine Schiffe gefunden</p>
      ) : (
        <>
          <VariantShipsTable ships={ships} variant={variant} />

          <CursorPaginationControls
            nextCursor={nextCursor}
            prevCursor={prevCursor}
            className="mt-4"
          />
        </>
      )}
    </Tile>
  );
};
