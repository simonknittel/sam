import { Tile } from "@/modules/common/components/Tile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { getVariantShips } from "../queries";
import { VariantShipsTable } from "./VariantShipsTable";

interface Props {
  readonly className?: string;
  readonly variantId: string;
}

export const VariantShipsTile = async ({ className, variantId }: Props) => {
  const { ships, nextCursor, prevCursor } = await getVariantShips(variantId);

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
