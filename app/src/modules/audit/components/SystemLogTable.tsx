import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { formatDate } from "@/modules/common/utils/formatDate";
import { AuditEventDefinitions, type AuditEventType } from "../utils/AuditEventTypes";
import { getAuditEvents } from "../queries/getAuditEvents";
import Note from "@/modules/common/components/Note";
import { createLoader, parseAsString, type SearchParams } from "nuqs/server";
import clsx from "clsx";

const loadSearchParams = createLoader({
  type: parseAsString,
  createdById: parseAsString,
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
      <Note
        type="info"
        message="Die Logs werden mit der Zeit detaillierter und besser."
      />

      {events.length === 0 ? (
        <div className="rounded-primary bg-neutral-800/50 p-4 flex flex-col items-center gap-4">
          <p>Keine Einträge gefunden</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left">
                <th className="pb-2 pr-4 font-medium text-neutral-400 whitespace-nowrap">
                  Datum &amp; Uhrzeit
                </th>
                <th className="pb-2 pr-4 font-medium text-neutral-400 whitespace-nowrap">
                  Typ
                </th>
                <th className="pb-2 pr-4 font-medium text-neutral-400 whitespace-nowrap">
                  Erstellt von
                </th>
                <th className="pb-2 font-medium text-neutral-400">Nachricht</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const definition =
                  AuditEventDefinitions[event.type as AuditEventType];
                const messageFn = definition?.message as ((d: unknown) => string) | undefined;
                const message = messageFn ? messageFn(event.data) : null;

                return (
                  <tr
                    key={event.id}
                    className="border-b border-neutral-800 hover:bg-neutral-800/30"
                  >
                    <td className="py-2 pr-4 text-neutral-300 whitespace-nowrap align-top">
                      {formatDate(event.createdAt)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-400 whitespace-nowrap align-top">
                      {event.type}
                    </td>
                    <td className="py-2 pr-4 text-neutral-300 whitespace-nowrap align-top">
                      {event.createdBy?.name ?? (
                        <span className="text-neutral-500">–</span>
                      )}
                    </td>
                    <td className="py-2 text-neutral-300 align-top">
                      {message ?? (
                        <span className="text-neutral-500 text-xs font-mono">
                          {JSON.stringify(event.data)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CursorPaginationControls nextCursor={nextCursor} prevCursor={prevCursor} />

      {isLastPage && events.length > 0 && (
        <p className="text-center text-sm text-neutral-500 italic">
          Nur Ereignisse ab dem 22. März 2026 sind verfügbar.
        </p>
      )}
    </div>
  );
};
