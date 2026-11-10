import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { Tooltip } from "@/modules/common/components/Tooltip";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import type {
  EventDetails,
  ResolvedEventParticipant,
} from "@sam-monorepo/application";
import type { Citizen } from "@sam-monorepo/database/client";
import type { SearchParams } from "nuqs/server";
import { FaInfoCircle } from "react-icons/fa";
import {
  loadParticipantsTableSearchParams,
  ParticipantsTableSort,
} from "../utils/participantsTableSearchParams";
import { AddEventParticipants } from "./AddEventParticipants";
import { ParticipantsTableRow } from "./ParticipantsTableRow";

const DATE_COLUMN_WIDTH = 160;

const CITIZEN_COLUMN: TableColumn = {
  key: "citizen",
  label: "Citizen",
  track: "160px",
  minWidth: 160,
};

const COMMENT_COLUMN: TableColumn = {
  key: "comment",
  label: "Kommentar",
  track: "240px",
  minWidth: 240,
};

const ROLES_COLUMN: TableColumn = {
  key: "roles",
  label: "Rollen/Zertifikate",
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

const getJoinedAtColumn = (isAppEvent: boolean): TableColumn => ({
  key: "joinedAt",
  label: isAppEvent ? (
    "Zugesagt am"
  ) : (
    <span className="flex items-center gap-2">
      Zugesagt am
      <Tooltip
        triggerChildren={<FaInfoCircle />}
        contentClassName="font-sans whitespace-normal normal-case"
      >
        Auf etwa 4 Minuten genau
      </Tooltip>
    </span>
  ),
  track: `${DATE_COLUMN_WIDTH}px`,
  minWidth: DATE_COLUMN_WIDTH,
});

const compareParticipants = (
  sort: ParticipantsTableSort,
  first: ResolvedEventParticipant,
  second: ResolvedEventParticipant,
) => {
  switch (sort) {
    case ParticipantsTableSort.CitizenAscending:
      return sortAscWithAndNullLast(
        first.citizen.handle,
        second.citizen.handle,
      );
    case ParticipantsTableSort.CitizenDescending:
      return sortDescAndNullLast(first.citizen.handle, second.citizen.handle);
    case ParticipantsTableSort.JoinedAtAscending:
      return sortAscWithAndNullLast(
        first.participant?.createdAt,
        second.participant?.createdAt,
      );
    case ParticipantsTableSort.JoinedAtDescending:
      return sortDescAndNullLast(
        first.participant?.createdAt,
        second.participant?.createdAt,
      );
    default:
      throw new Error(`Unknown sort: ${sort satisfies never}`);
  }
};

/** Without a match for the filters, the event still can have participants */
const getEmptyMessage = (isAppEvent: boolean, hasParticipants: boolean) => {
  if (hasParticipants) return "Keine Teilnehmer für diese Filter.";

  return isAppEvent
    ? "Bisher hat sich niemand angemeldet."
    : "Zu den gemeldeten Teilnehmern gibt es keine Spynet-Einträge.";
};

interface Props {
  readonly className?: string;
  readonly event: Pick<EventDetails, "id">;
  readonly participants: readonly ResolvedEventParticipant[];
  readonly currentCitizenId: Citizen["id"];
  readonly isAppEvent: boolean;
  readonly canManageParticipants: boolean;
  readonly searchParams: Promise<SearchParams>;
}

export const ParticipantsTableTile = async ({
  className,
  event,
  participants,
  currentCitizenId,
  isAppEvent,
  canManageParticipants,
  searchParams,
}: Props) => {
  const [{ role, sort }, visibleRoles] = await Promise.all([
    loadParticipantsTableSearchParams(searchParams),
    getVisibleRoles(),
  ]);

  /**
   * Only the roles that the row shows match, thus a role that the viewer
   * cannot see selects no participant
   */
  const visibleRoleIds = new Set(
    visibleRoles.map((visibleRole) => visibleRole.id),
  );
  const selectedRoleIds = new Set(role);
  const hasRoleFilter = selectedRoleIds.size > 0;

  const shownParticipants = participants
    .filter(
      ({ citizen }) =>
        !hasRoleFilter ||
        citizen.roleAssignments.some(
          (assignment) =>
            visibleRoleIds.has(assignment.roleId) &&
            selectedRoleIds.has(assignment.roleId),
        ),
    )
    .toSorted((first, second) => compareParticipants(sort, first, second));

  const columns = [
    CITIZEN_COLUMN,
    getJoinedAtColumn(isAppEvent),
    isAppEvent && COMMENT_COLUMN,
    ROLES_COLUMN,
    canManageParticipants && ACTIONS_COLUMN,
  ].filter((column) => column !== false);

  return (
    <TableTile
      className={className}
      heading={
        <span className="flex items-center gap-2">
          {hasRoleFilter
            ? `Teilnehmer (${shownParticipants.length} von ${participants.length})`
            : `Teilnehmer (${participants.length})`}
          {!isAppEvent && (
            <Tooltip triggerChildren={<FaInfoCircle />}>
              Es werden nur Discord-Anmeldungen mit einem Spynet-Eintrag
              angezeigt.
            </Tooltip>
          )}
        </span>
      }
      cta={
        canManageParticipants ? (
          <AddEventParticipants eventId={event.id} />
        ) : null
      }
      columns={columns}
      isEmpty={shownParticipants.length === 0}
      emptyMessage={getEmptyMessage(isAppEvent, participants.length > 0)}
    >
      {shownParticipants.map((resolvedParticipant) => (
        <ParticipantsTableRow
          key={resolvedParticipant.citizen.id}
          eventId={event.id}
          resolvedParticipant={resolvedParticipant}
          currentCitizenId={currentCitizenId}
          showCommentColumn={isAppEvent}
          showRemoveButton={canManageParticipants}
        />
      ))}
    </TableTile>
  );
};
