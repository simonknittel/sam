import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  type SearchParams,
} from "nuqs/server";
import { getAuditEvents } from "../queries/getAuditEvents";
import {
  AuditEventDefinitions,
  type AuditEventType,
} from "../utils/AuditEventTypes";

const TABLE_MIN_WIDTH = "min-w-200";
const GRID_CLASSES = "grid-cols-[150px_250px_150px_1fr]";

const loadSearchParams = createLoader({
  type: parseAsArrayOf(parseAsString),
  createdById: parseAsArrayOf(parseAsString),
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const SystemLogTable = async ({ className, searchParams }: Props) => {
  const { type, createdById, cursor, direction } =
    await loadSearchParams(searchParams);

  const { events, nextCursor, prevCursor } = await getAuditEvents(
    type,
    createdById,
    cursor,
    direction,
  );

  const isLastPage = !nextCursor;

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      {events.length === 0 ? (
        <div className="rounded-primary bg-secondary p-4 grid place-content-center">
          <p>Bisher wurden keine Ereignisse aufgezeichnet.</p>
        </div>
      ) : (
        <Table
          className={clsx(TABLE_MIN_WIDTH, "bg-secondary rounded-primary p-4")}
        >
          <THead className={GRID_CLASSES}>
            <th>Date</th>
            <th>Type</th>
            <th>User</th>
            <th>Message</th>
          </THead>

          <TBody className="text-sm">
            {events.map((event) => {
              const definition =
                AuditEventDefinitions[event.type as AuditEventType];
              // @ts-expect-error Improve types
              const message = definition.message(JSON.parse(event.data));

              const createdBy = event.createdBy?.name || event.createdBy?.id;

              return (
                <TRow key={event.id} className={clsx("h-8", GRID_CLASSES)}>
                  <td className="truncate">{formatDate(event.createdAt)}</td>

                  <td className="truncate font-mono text-neutral-400">
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
          </TBody>
        </Table>
      )}

      <CursorPaginationControls
        nextCursor={nextCursor}
        prevCursor={prevCursor}
      />

      {isLastPage && events.length > 0 && (
        <p className="text-center text-sm text-neutral-500">
          Es werden nur Ereignisse ab dem 22. März 2026 angezeigt.
        </p>
      )}
    </div>
  );
};
