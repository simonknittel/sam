import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getShipChanges } from "../queries";
import { ShipChangesTable } from "./ShipChangesTable";

const loadSearchParams = createLoader({
  changeType: parseAsStringLiteral([
    "both",
    "creation",
    "deletion",
  ]).withDefault("both"),
  variantIds: parseAsArrayOf(parseAsString),
  actorId: parseAsString,
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const ShipChangesTile = async ({ className, searchParams }: Props) => {
  const { changeType, variantIds, cursor, direction } =
    await loadSearchParams(searchParams);

  const { changes, nextCursor, prevCursor } = await getShipChanges({
    changeType,
    variantIds: variantIds?.length ? variantIds : [],
    cursor,
    direction,
  });

  return (
    <section className={className}>
      <div className="rounded-primary bg-neutral-800/50 p-4 overflow-x-auto">
        {changes.length === 0 ? (
          <div className="grid place-content-center">
            <p className="text-white/90">Keine Änderungen gefunden</p>
          </div>
        ) : (
          <>
            <ShipChangesTable changes={changes} />

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
