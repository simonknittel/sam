import { Tile } from "@/modules/common/components/Tile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { createLoader, type SearchParams } from "nuqs/server";
import { getVariantShips } from "../queries/getVariantShips";
import { VariantShipsTable } from "./VariantShipsTable";

const loadSearchParams = createLoader(cursorPaginationParsers);

interface Props {
  readonly className?: string;
  readonly variantId: string;
  readonly searchParams: Promise<SearchParams>;
}

export const VariantShipsTile = async ({
  className,
  variantId,
  searchParams,
}: Props) => {
  const { cursor, direction } = await loadSearchParams(searchParams);
  const { ships, nextCursor, prevCursor } = await getVariantShips(variantId, {
    cursor,
    direction,
  });

  return (
    <Tile heading="Einzelschiffe" className={className}>
      {ships.length === 0 ? (
        <p className="text-white/90 text-center">Keine Schiffe gefunden</p>
      ) : (
        <>
          <VariantShipsTable ships={ships} />

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
