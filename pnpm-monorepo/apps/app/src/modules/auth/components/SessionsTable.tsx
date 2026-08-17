import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { createLoader, type SearchParams } from "nuqs/server";
import { getMySessions } from "../queries/getMySessions";
import { formatUserAgent } from "../utils/formatUserAgent";
import {
  SESSION_SORT_PARAM,
  SESSION_STATUS_PARAM,
  sessionSortParser,
  SessionStatus,
  sessionStatusParser,
} from "../utils/sessionFilterParams";
import { DeleteSessionButton } from "./DeleteSessionButton";

const TABLE_MIN_WIDTH = "min-w-200";
const GRID_CLASSES = "grid-cols-[256px_130px_150px_1fr_150px_130px]";
const UNKNOWN = "Unbekannt";

const loadSearchParams = createLoader({
  [SESSION_STATUS_PARAM]: sessionStatusParser,
  [SESSION_SORT_PARAM]: sessionSortParser,
});

const EMPTY_MESSAGE_BY_STATUS: Record<SessionStatus, string> = {
  [SessionStatus.Active]: "Du hast keine aktiven Sitzungen.",
  [SessionStatus.Expired]: "Du hast keine abgelaufenen Sitzungen.",
  [SessionStatus.All]: "Für dich sind keine Sitzungen gespeichert.",
};

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const SessionsTable = async ({ className, searchParams }: Props) => {
  const { status, sort } = await loadSearchParams(searchParams);

  const sessions = await getMySessions(status, sort);

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      {sessions.length === 0 ? (
        <div className="rounded-primary bg-secondary p-4 grid place-content-center">
          <p>{EMPTY_MESSAGE_BY_STATUS[status]}</p>
        </div>
      ) : (
        <Table
          className="bg-secondary rounded-primary p-4"
          tableClassName={TABLE_MIN_WIDTH}
        >
          <THead className={GRID_CLASSES}>
            <th>Session-ID</th>
            <th>Status</th>
            <th>Erstellt</th>
            <th>Browser</th>
            <th>Läuft ab</th>
            <th className="sr-only">Aktionen</th>
          </THead>

          <TBody className="text-sm">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </TBody>
        </Table>
      )}

      <p className="text-center text-sm text-neutral-500">
        Eine Sitzung entsteht bei jeder Anmeldung und läuft nach 31 Tagen ab.
      </p>
    </div>
  );
};

interface SessionRowProps {
  readonly session: Awaited<ReturnType<typeof getMySessions>>[number];
}

const SessionRow = ({ session }: SessionRowProps) => {
  const userAgent = formatUserAgent(session.userAgent) ?? session.userAgent;

  return (
    <TRow className={clsx("h-10", GRID_CLASSES)}>
      <td className="overflow-hidden font-mono text-neutral-400">
        <span className="block truncate" title={session.id}>
          {session.id}
        </span>
      </td>

      <td>
        {session.isCurrent && (
          <StatusBadge tone={StatusTone.Current}>Aktuell</StatusBadge>
        )}

        {session.isExpired && (
          <StatusBadge tone={StatusTone.Expired}>Abgelaufen</StatusBadge>
        )}
      </td>

      <td className={clsx({ "text-neutral-500": !session.createdAt })}>
        {formatDate(session.createdAt) ?? UNKNOWN}
      </td>

      <td
        title={session.userAgent ?? undefined}
        className={clsx("truncate", { "text-neutral-500": !userAgent })}
      >
        {userAgent ?? UNKNOWN}
      </td>

      <td>{formatDate(session.expires)}</td>

      <td>
        <DeleteSessionButton
          sessionId={session.id}
          isCurrent={session.isCurrent}
        />
      </td>
    </TRow>
  );
};

enum StatusTone {
  Current = "current",
  Expired = "expired",
}

interface StatusBadgeProps {
  readonly tone: StatusTone;
  readonly children: string;
}

const StatusBadge = ({ tone, children }: StatusBadgeProps) => {
  return (
    <span
      className={clsx("rounded-secondary border px-2 py-1 text-xs", {
        "border-me/30 bg-me/10 text-me": tone === StatusTone.Current,
        "border-white/10 bg-white/5 text-neutral-400":
          tone === StatusTone.Expired,
      })}
    >
      {children}
    </span>
  );
};
