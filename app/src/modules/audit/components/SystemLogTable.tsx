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
        <div className="overflow-x-auto bg-secondary rounded-primary p-4">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr
                className={clsx(
                  "border-b border-neutral-700 text-left grid gap-2 uppercase font-mono font-bold text-neutral-400 whitespace-nowrap pb-2",
                  GRID_CLASSES,
                )}
              >
                <th>Date</th>

                <th>Type</th>

                <th>User</th>

                <th>Message</th>
              </tr>
            </thead>

            <tbody>
              {events.map((event) => {
                const definition =
                  AuditEventDefinitions[event.type as AuditEventType];
                // TODO: Improve types
                const message = (
                  definition as {
                    message: (data: unknown) => string;
                  }
                ).message(event.data as unknown);

                const createdBy = event.createdBy?.name || event.createdBy?.id;

                return (
                  <tr
                    key={event.id}
                    className={clsx(
                      "border-b border-neutral-800 hover:bg-neutral-800/30 grid gap-2 py-2",
                      GRID_CLASSES,
                    )}
                  >
                    <td className="truncate align-top">
                      {formatDate(event.createdAt)}
                    </td>

                    <td className="truncate align-top font-mono text-xs text-neutral-400">
                      {event.type}
                    </td>

                    <td title={createdBy} className="align-top truncate">
                      {createdBy}
                    </td>

                    <td title={message} className="align-top truncate">
                      {message}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
