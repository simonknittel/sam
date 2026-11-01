import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import {
  limitFilterValues,
  loadCitizenLogTableSearchParams,
} from "@/modules/citizen/utils/citizenLogTableSearchParams";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import {
  findIdentityLogTablePage,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import type { SearchParams } from "nuqs/server";
import { CITIZEN_LOG_TABLE_COLUMNS } from "./citizenLogTableColumns";
import { OtherTableRow } from "./OtherTableRow";

const COLUMNS: TableColumn[] = [
  CITIZEN_LOG_TABLE_COLUMNS.citizen,
  {
    key: "type",
    label: "Merkmal",
    track: "minmax(140px,1fr)",
    minWidth: 140,
  },
  { key: "content", label: "Wert", track: "minmax(200px,2fr)", minWidth: 200 },
  ...CITIZEN_LOG_TABLE_COLUMNS.end,
];

/** The number of rows on one page of the table */
const PAGE_SIZE = 50;

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const OtherTableTile = async ({ className, searchParams }: Props) => {
  const { type, confirmation, sort, cursor, direction } =
    await loadCitizenLogTableSearchParams(searchParams);

  const { rows, nextCursor, prevCursor } = await findIdentityLogTablePage(
    getApplicationContext(),
    await getRequestActor(),
    {
      filters: {
        types: limitFilterValues(type),
        confirmationValues: limitFilterValues(confirmation),
      },
      sort,
      cursor,
    },
    {
      pageSize: PAGE_SIZE,
      direction,
      unknownCursor: UnknownCursorBehavior.FirstPage,
    },
  ).catch(throwApplicationErrorForPage);

  return (
    <TableTile
      className={className}
      columns={COLUMNS}
      isEmpty={rows.length === 0}
      emptyMessage="Keine Einträge gefunden."
      bodyClassName="text-sm"
      footer={
        <CursorPaginationControls
          nextCursor={nextCursor}
          prevCursor={prevCursor}
        />
      }
    >
      {rows.map((log) => (
        <OtherTableRow key={log.id} log={log} />
      ))}
    </TableTile>
  );
};
