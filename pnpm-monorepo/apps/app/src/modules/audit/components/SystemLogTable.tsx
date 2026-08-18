import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { TRow } from "@/modules/common/components/Table";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { parseAsArrayOf, parseAsString, type SearchParams } from "nuqs/server";
import { getAuditEvents } from "../queries/getAuditEvents";
import { getAuditEventMessage } from "../utils/getAuditEventMessage";
import {
  SYSTEM_LOG_FROM_PARAM,
  SYSTEM_LOG_TO_PARAM,
  SYSTEM_LOG_VOLUME_PARAM,
  systemLogVolumeParser,
} from "../utils/systemLogFilterParams";

const COLUMNS: TableColumn[] = [
  { key: "date", label: "Date", track: "150px", minWidth: 150 },
  { key: "type", label: "Type", track: "250px", minWidth: 250 },
  { key: "user", label: "User", track: "150px", minWidth: 150 },
  { key: "message", label: "Message", track: "1fr", minWidth: 226 },
];

const loadSearchParams = createCursorPaginationLoader({
  type: parseAsArrayOf(parseAsString),
  createdById: parseAsArrayOf(parseAsString),
  [SYSTEM_LOG_VOLUME_PARAM]: systemLogVolumeParser,
  [SYSTEM_LOG_FROM_PARAM]: parseAsString,
  [SYSTEM_LOG_TO_PARAM]: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const SystemLogTable = async ({ className, searchParams }: Props) => {
  const { type, createdById, cursor, direction, volume, from, to } =
    await loadSearchParams(searchParams);

  const { events, nextCursor, prevCursor } = await getAuditEvents(
    type,
    createdById,
    cursor,
    direction,
    volume,
    from,
    to,
  );

  const isLastPage = !nextCursor;
  const hasActiveFilters = Boolean(
    (type && type.length > 0) ||
    (createdById && createdById.length > 0) ||
    from ||
    to,
  );

  return (
    <TableTile
      className={className}
      columns={COLUMNS}
      isEmpty={events.length === 0}
      emptyMessage={
        hasActiveFilters
          ? "Keine Ereignisse für diese Filter."
          : "Bisher wurden keine Ereignisse aufgezeichnet."
      }
      bodyClassName="text-sm"
      footer={
        <>
          <CursorPaginationControls
            nextCursor={nextCursor}
            prevCursor={prevCursor}
          />

          {isLastPage && events.length > 0 && (
            <p className="text-center text-sm text-neutral-500">
              Es werden nur Ereignisse ab dem 22. März 2026 angezeigt.
            </p>
          )}
        </>
      }
    >
      {events.map((event) => {
        const message = getAuditEventMessage(event.type, event.data);
        const createdBy = event.createdBy?.name || event.createdBy?.id;

        return (
          <TRow key={event.id} className="h-8">
            <td>{formatDate(event.createdAt)}</td>

            <td
              title={event.type}
              className="truncate font-mono text-neutral-400"
            >
              {event.type}
            </td>

            <td title={createdBy} className="truncate">
              {createdBy}
            </td>

            <td title={message} className="truncate">
              {message}
            </td>
          </TRow>
        );
      })}
    </TableTile>
  );
};
