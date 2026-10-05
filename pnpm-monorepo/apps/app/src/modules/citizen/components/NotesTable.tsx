import { requireAuthentication } from "@/modules/auth/server";
import type { CitizenLogTableRow } from "@/modules/citizen/queries/citizenLogTableSelect";
import { CitizenLogTableSort } from "@/modules/citizen/utils/citizenLogTableSearchParams";
import { getNotePermissionAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import { Actions } from "@/modules/common/components/Actions";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { SortDirection } from "@/modules/common/components/SortableColumnHeader";
import { formatDate } from "@/modules/common/utils/formatDate";
import { CitizenLogTableSortableColumnHeader } from "./CitizenLogTableLinks";
import { ConfirmationState } from "./ConfirmationState";
import { DeleteLog } from "./DeleteLog";
import { UpdateNote } from "./notes/UpdateNote";

interface Props {
  readonly rows: readonly CitizenLogTableRow[];
}

export const NotesTable = ({ rows }: Props) => {
  return (
    <table className="w-full min-w-500">
      <thead>
        <tr className="-mx-2 grid grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_44px] items-center gap-4 text-left text-neutral-500">
          <th className="px-2">Citizen</th>

          <th>Inhalt</th>

          <th>Notizart</th>

          <th>Geheimhaltungsstufe</th>

          <th>Bestätigungsstatus</th>

          <CitizenLogTableSortableColumnHeader
            ascending={CitizenLogTableSort.ConfirmedAtAscending}
            descending={CitizenLogTableSort.ConfirmedAtDescending}
            firstDirection={SortDirection.Descending}
          >
            Bestätigt am
          </CitizenLogTableSortableColumnHeader>

          <th className="whitespace-nowrap">Bestätigt von</th>

          <CitizenLogTableSortableColumnHeader
            ascending={CitizenLogTableSort.CreatedAtAscending}
            descending={CitizenLogTableSort.CreatedAtDescending}
            firstDirection={SortDirection.Descending}
          >
            Eingereicht am
          </CitizenLogTableSortableColumnHeader>

          <th className="whitespace-nowrap">Eingereicht von</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((citizenLog) => {
          return (
            <tr
              key={citizenLog.id}
              className="-mx-2 grid h-14 grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_44px] items-center gap-4 rounded-secondary first:mt-2"
            >
              <td className="overflow-hidden">
                <CitizenCellLink
                  className="h-14"
                  citizen={citizenLog.citizen}
                  page="/notes"
                />
              </td>

              <td className="truncate" title={citizenLog.content || undefined}>
                {citizenLog.content}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.noteType?.name}
              >
                {citizenLog.noteType?.name}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.classificationLevel?.name}
              >
                {citizenLog.classificationLevel?.name}
              </td>

              <td>
                <ConfirmationState
                  citizenLog={{
                    id: citizenLog.id,
                    citizenId: citizenLog.citizenId,
                    type: citizenLog.type,
                    confirmed: citizenLog.confirmed,
                    citizen: { deletedAt: citizenLog.citizen.deletedAt },
                  }}
                />
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={formatDate(citizenLog.confirmedAt) || ""}
              >
                {formatDate(citizenLog.confirmedAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.confirmedBy?.name || undefined}
              >
                {citizenLog.confirmedBy?.name}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={formatDate(citizenLog.createdAt) || ""}
              >
                {formatDate(citizenLog.createdAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.submittedBy?.name || "Unbekannt"}
              >
                {citizenLog.submittedBy?.name || "Unbekannt"}
              </td>

              <td>
                <NotesTableActions note={citizenLog} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

interface NotesTableActionsProps {
  readonly note: CitizenLogTableRow;
}

/**
 * The buttons that change or delete the note, with the permission checks of
 * the notes page of the citizen
 */
const NotesTableActions = async ({ note }: NotesTableActionsProps) => {
  /** The logs of a deleted citizen are read only */
  if (note.citizen.deletedAt) return null;

  const authentication = await requireAuthentication();
  const attributes = getNotePermissionAttributes(note);
  const [showUpdate, showDelete] = await Promise.all([
    authentication.authorize("note", "update", attributes),
    authentication.authorize("note", "delete", attributes),
  ]);
  if (!showUpdate && !showDelete) return null;

  return (
    <Actions>
      {showUpdate && <UpdateNote note={note} />}
      {showDelete && (
        <DeleteLog log={{ id: note.id, citizenId: note.citizenId }} />
      )}
    </Actions>
  );
};
