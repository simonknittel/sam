import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { TableRowAlignment, TRow } from "@/modules/common/components/Table";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import type {
  EventApplicationRow,
  EventDetails,
} from "@sam-monorepo/application";
import { EventApplicationStatus } from "@sam-monorepo/domain";
import { AnswerEventApplication } from "./AnswerEventApplication";

const CITIZEN_COLUMN: TableColumn = {
  key: "citizen",
  label: "Citizen",
  track: "160px",
  minWidth: 160,
};

const STATUS_COLUMN: TableColumn = {
  key: "status",
  label: "Status",
  track: "120px",
  minWidth: 120,
};

const APPLIED_AT_COLUMN: TableColumn = {
  key: "appliedAt",
  label: "Angefragt am",
  track: "160px",
  minWidth: 160,
};

const COMMENT_COLUMN: TableColumn = {
  key: "comment",
  label: "Kommentar",
  track: "minmax(200px,1fr)",
  minWidth: 200,
};

const DECLINED_BY_COLUMN: TableColumn = {
  key: "declinedBy",
  label: "Abgelehnt von",
  track: "160px",
  minWidth: 160,
};

const DECLINE_REASON_COLUMN: TableColumn = {
  key: "declineReason",
  label: "Grund",
  track: "minmax(200px,1fr)",
  minWidth: 200,
};

const ACTIONS_COLUMN: TableColumn = {
  key: "actions",
  label: "Aktionen",
  track: "64px",
  minWidth: 64,
  headerClassName: "sr-only",
};

interface Props {
  readonly className?: string;
  readonly event: Pick<EventDetails, "id">;
  readonly applications: readonly EventApplicationRow[];
  readonly canManageParticipants: boolean;
}

/**
 * The open applications, and the declined ones of citizens who were not
 * signed up later, the newest first
 */
export const EventApplicationsTableTile = ({
  className,
  event,
  applications,
  canManageParticipants,
}: Props) => {
  const columns = [
    CITIZEN_COLUMN,
    STATUS_COLUMN,
    APPLIED_AT_COLUMN,
    COMMENT_COLUMN,
    DECLINED_BY_COLUMN,
    DECLINE_REASON_COLUMN,
    canManageParticipants && ACTIONS_COLUMN,
  ].filter((column) => column !== false);

  return (
    <TableTile
      className={className}
      heading={`Teilnahmeanfragen (${applications.length})`}
      columns={columns}
      isEmpty={applications.length === 0}
      emptyMessage="Keine Teilnahmeanfragen."
    >
      {applications.map((application) => (
        <EventApplicationsTableRow
          key={application.id}
          eventId={event.id}
          application={application}
          showAnswerButtons={canManageParticipants}
        />
      ))}
    </TableTile>
  );
};

interface RowProps {
  readonly eventId: EventDetails["id"];
  readonly application: EventApplicationRow;
  readonly showAnswerButtons: boolean;
}

const EventApplicationsTableRow = ({
  eventId,
  application,
  showAnswerButtons,
}: RowProps) => {
  const isOpen = application.status === EventApplicationStatus.Open;

  return (
    <TRow alignment={TableRowAlignment.Top}>
      <td className="min-w-0">
        <CitizenCellLink className="h-8" citizen={application.citizen} />
      </td>

      <td className="flex h-8 items-center">
        {isOpen ? "Offen" : "Abgelehnt"}
      </td>

      <td className="flex h-8 items-center">
        <time dateTime={application.createdAt.toISOString()}>
          {formatDate(application.createdAt)}
        </time>
      </td>

      <TextCell text={application.comment} />

      <td className="min-w-0">
        {isOpen ? (
          <span className="flex h-8 items-center text-neutral-500 italic">
            -
          </span>
        ) : (
          <CitizenCellLink className="h-8" citizen={application.declinedBy} />
        )}
      </td>

      <TextCell text={application.declineReason} />

      {showAnswerButtons && (
        <td className="flex min-h-8 items-center">
          {isOpen && (
            <AnswerEventApplication
              eventId={eventId}
              /** The client component gets only these fields */
              citizen={{
                id: application.citizen.id,
                handle: application.citizen.handle,
                deletedAt: application.citizen.deletedAt,
              }}
            />
          )}
        </td>
      )}
    </TRow>
  );
};

interface TextCellProps {
  readonly text: string | null;
}

const TextCell = ({ text }: TextCellProps) => (
  <td className="flex min-h-8 items-center">
    {text ? (
      <span className="line-clamp-2" title={text}>
        {text}
      </span>
    ) : (
      <span className="text-neutral-500 italic">-</span>
    )}
  </td>
);
