import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import type { SearchParams } from "nuqs/server";
import { getUploads } from "../queries/getUploads";
import {
  UPLOAD_AUTHOR_PARAM,
  UPLOAD_FROM_PARAM,
  UPLOAD_QUERY_PARAM,
  UPLOAD_TO_PARAM,
  UPLOAD_USAGE_PARAM,
  uploadFilterParsers,
} from "../utils/uploadFilterParams";
import { UploadRow } from "./UploadRow";

/**
 * The preview column's header carries its name for screen readers only —
 * inside the cell rather than on it, since a `sr-only` `<th>` leaves the
 * grid and would shift every following header out of its column.
 */
const COLUMNS: TableColumn[] = [
  {
    key: "preview",
    label: <span className="sr-only">Vorschau</span>,
    track: "48px",
    minWidth: 48,
  },
  {
    key: "fileName",
    label: "Dateiname",
    track: "minmax(200px,1.5fr)",
    minWidth: 200,
  },
  { key: "size", label: "Größe", track: "100px", minWidth: 100 },
  { key: "createdAt", label: "Hochgeladen", track: "150px", minWidth: 150 },
  {
    key: "usage",
    label: "Verwendung",
    track: "minmax(240px,2fr)",
    minWidth: 240,
  },
];

/** Only the manager scope has an author and something to act on. */
const MANAGER_COLUMNS: TableColumn[] = [
  {
    key: "createdBy",
    label: "Hochgeladen von",
    track: "150px",
    minWidth: 150,
  },
  {
    key: "actions",
    label: "Aktionen",
    track: "130px",
    minWidth: 130,
    headerClassName: "sr-only",
  },
];

const loadSearchParams = createCursorPaginationLoader(uploadFilterParsers);

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const UploadsTable = async ({ className, searchParams }: Props) => {
  const {
    [UPLOAD_USAGE_PARAM]: usage,
    [UPLOAD_FROM_PARAM]: from,
    [UPLOAD_TO_PARAM]: to,
    [UPLOAD_QUERY_PARAM]: query,
    [UPLOAD_AUTHOR_PARAM]: createdById,
    cursor,
    direction,
  } = await loadSearchParams(searchParams);

  const { uploads, canManage, nextCursor, prevCursor } = await getUploads(
    usage,
    from,
    to,
    query,
    createdById,
    cursor,
    direction,
  );

  const hasActiveFilters = Boolean(
    (usage && usage.length > 0) ||
    (createdById && createdById.length > 0) ||
    from ||
    to ||
    query,
  );

  return (
    <TableTile
      className={className}
      columns={canManage ? [...COLUMNS, ...MANAGER_COLUMNS] : COLUMNS}
      isEmpty={uploads.length === 0}
      emptyMessage={
        hasActiveFilters
          ? "Keine Uploads für diese Filter."
          : canManage
            ? "Es wurden bisher keine Dateien hochgeladen."
            : "Du hast bisher keine Dateien hochgeladen."
      }
      bodyClassName="text-sm"
      footer={
        <CursorPaginationControls
          nextCursor={nextCursor}
          prevCursor={prevCursor}
        />
      }
    >
      {uploads.map((upload) => (
        <UploadRow key={upload.id} upload={upload} canManage={canManage} />
      ))}
    </TableTile>
  );
};
