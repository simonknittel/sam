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
  findNoteTablePage,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import type { SearchParams } from "nuqs/server";
import { CITIZEN_LOG_TABLE_COLUMNS } from "./citizenLogTableColumns";
import { NotesTableRow } from "./NotesTableRow";

const COLUMNS: TableColumn[] = [
  CITIZEN_LOG_TABLE_COLUMNS.citizen,
  {
    key: "content",
    label: "Inhalt",
    track: "minmax(250px,3fr)",
    minWidth: 250,
  },
  {
    key: "noteType",
    label: "Notizart",
    track: "minmax(120px,1fr)",
    minWidth: 120,
  },
  {
    key: "classificationLevel",
    label: "Geheimhaltungsstufe",
    track: "minmax(170px,1fr)",
    minWidth: 170,
  },
  ...CITIZEN_LOG_TABLE_COLUMNS.end,
];

/** The number of rows on one page of the table */
const PAGE_SIZE = 50;

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const NotesTableTile = async ({ className, searchParams }: Props) => {
  const {
    note_type,
    classification_level,
    confirmation,
    sort,
    cursor,
    direction,
  } = await loadCitizenLogTableSearchParams(searchParams);

  const { rows, nextCursor, prevCursor } = await findNoteTablePage(
    getApplicationContext(),
    await getRequestActor(),
    {
      filters: {
        noteTypeIds: limitFilterValues(note_type),
        classificationLevelIds: limitFilterValues(classification_level),
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
      emptyMessage="Keine Notizen gefunden."
      bodyClassName="text-sm"
      footer={
        <CursorPaginationControls
          nextCursor={nextCursor}
          prevCursor={prevCursor}
        />
      }
    >
      {rows.map((note) => (
        <NotesTableRow key={note.id} note={note} />
      ))}
    </TableTile>
  );
};
