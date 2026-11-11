import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { TableRowAlignment, TRow } from "@/modules/common/components/Table";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import type {
  EventDetails,
  EventInvitationRow,
} from "@sam-monorepo/application";
import { EventInvitationStatus } from "@sam-monorepo/domain";
import { WithdrawEventInvitation } from "./WithdrawEventInvitation";

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

const INVITED_BY_COLUMN: TableColumn = {
  key: "invitedBy",
  label: "Eingeladen von",
  track: "160px",
  minWidth: 160,
};

const INVITED_AT_COLUMN: TableColumn = {
  key: "invitedAt",
  label: "Eingeladen am",
  track: "160px",
  minWidth: 160,
};

const MESSAGE_COLUMN: TableColumn = {
  key: "message",
  label: "Nachricht",
  track: "minmax(200px,1fr)",
  minWidth: 200,
};

const DECLINE_COMMENT_COLUMN: TableColumn = {
  key: "declineComment",
  label: "Kommentar der Absage",
  track: "minmax(200px,1fr)",
  minWidth: 200,
};

const ACTIONS_COLUMN: TableColumn = {
  key: "actions",
  label: "Aktionen",
  track: "32px",
  minWidth: 32,
  headerClassName: "sr-only",
};

interface Props {
  readonly className?: string;
  readonly event: Pick<EventDetails, "id">;
  readonly invitations: readonly EventInvitationRow[];
  readonly canManageParticipants: boolean;
}

/** The open invitations, and the declined ones of citizens who did not sign up */
export const EventInvitationsTableTile = ({
  className,
  event,
  invitations,
  canManageParticipants,
}: Props) => {
  const columns = [
    CITIZEN_COLUMN,
    STATUS_COLUMN,
    INVITED_BY_COLUMN,
    INVITED_AT_COLUMN,
    MESSAGE_COLUMN,
    DECLINE_COMMENT_COLUMN,
    canManageParticipants && ACTIONS_COLUMN,
  ].filter((column) => column !== false);

  return (
    <TableTile
      className={className}
      heading={`Einladungen (${invitations.length})`}
      columns={columns}
      isEmpty={invitations.length === 0}
      emptyMessage="Keine offenen oder abgelehnten Einladungen."
    >
      {invitations.map((invitation) => (
        <EventInvitationsTableRow
          key={invitation.id}
          eventId={event.id}
          invitation={invitation}
          showWithdrawButton={canManageParticipants}
        />
      ))}
    </TableTile>
  );
};

interface RowProps {
  readonly eventId: EventDetails["id"];
  readonly invitation: EventInvitationRow;
  readonly showWithdrawButton: boolean;
}

const EventInvitationsTableRow = ({
  eventId,
  invitation,
  showWithdrawButton,
}: RowProps) => {
  const isOpen = invitation.status === EventInvitationStatus.Open;

  return (
    <TRow alignment={TableRowAlignment.Top}>
      <td className="flex h-8 items-center overflow-hidden px-2">
        <CitizenLink citizen={invitation.citizen} className="truncate" />
      </td>

      <td className="flex h-8 items-center">
        {isOpen ? "Offen" : "Abgelehnt"}
      </td>

      <td className="flex h-8 items-center overflow-hidden">
        <CitizenLink citizen={invitation.invitedBy} className="truncate" />
      </td>

      <td className="flex h-8 items-center">
        <time dateTime={invitation.createdAt.toISOString()}>
          {formatDate(invitation.createdAt)}
        </time>
      </td>

      <TextCell text={invitation.message} />

      <TextCell text={invitation.declineComment} />

      {showWithdrawButton && (
        <td className="flex min-h-8 items-center">
          {isOpen && (
            <WithdrawEventInvitation
              eventId={eventId}
              citizen={invitation.citizen}
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
