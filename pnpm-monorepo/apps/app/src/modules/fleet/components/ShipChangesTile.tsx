import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { parseAsStringLiteral, type SearchParams } from "nuqs/server";
import { getShipChanges } from "../queries/getShipChanges";
import { ShipChangeRow } from "./ShipChangeRow";

const COLUMNS: TableColumn[] = [
  { key: "date", label: "Datum", track: "160px", minWidth: 160 },
  { key: "changeType", label: "Typ", track: "100px", minWidth: 100 },
  { key: "variant", label: "Variant", track: "256px", minWidth: 256 },
  { key: "ship", label: "Schiff", track: "1fr", minWidth: 120 },
  { key: "actor", label: "Akteur", track: "1fr", minWidth: 120 },
];

const loadSearchParams = createCursorPaginationLoader({
  changeType: parseAsStringLiteral([
    "both",
    "creation",
    "deletion",
  ]).withDefault("both"),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const ShipChangesTile = async ({ className, searchParams }: Props) => {
  const { changeType, cursor, direction } =
    await loadSearchParams(searchParams);

  const { changes, nextCursor, prevCursor } = await getShipChanges({
    changeType,
    cursor,
    direction,
  });

  return (
    <TableTile
      className={className}
      columns={COLUMNS}
      isEmpty={changes.length === 0}
      emptyMessage="Keine Änderungen gefunden"
      footer={
        <CursorPaginationControls
          nextCursor={nextCursor}
          prevCursor={prevCursor}
        />
      }
    >
      {changes.map((change, index) => (
        <ShipChangeRow
          key={`${change.ship.id}:${change.changeType}:${index}`}
          change={change}
        />
      ))}
    </TableTile>
  );
};
