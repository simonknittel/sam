import { requireAuthenticationPage } from "@/modules/auth/server";
import { Actions } from "@/modules/common/components/Actions";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  getNotePermissionAttributes,
  type CitizenLogTableRow,
} from "@sam-monorepo/application";
import { CitizenLogAuthorCell } from "./CitizenLogAuthorCell";
import { ConfirmationState } from "./ConfirmationState";
import { DeleteLog } from "./DeleteLog";
import { UpdateNote } from "./notes/UpdateNote";

interface Props {
  readonly note: CitizenLogTableRow;
}

export const NotesTableRow = ({ note }: Props) => {
  return (
    <TRow>
      <td className="min-w-0">
        <CitizenCellLink className="h-8" citizen={note.citizen} page="/notes" />
      </td>

      <td className="truncate" title={note.content || undefined}>
        {note.content}
      </td>

      <td className="truncate" title={note.noteType?.name}>
        {note.noteType?.name}
      </td>

      <td className="truncate" title={note.classificationLevel?.name}>
        {note.classificationLevel?.name}
      </td>

      <td className="min-w-0">
        <NoteConfirmationState note={note} />
      </td>

      <td className="truncate">{formatDate(note.confirmedAt)}</td>

      <CitizenLogAuthorCell author={note.confirmedBy} />

      <td className="truncate">{formatDate(note.createdAt)}</td>

      <CitizenLogAuthorCell author={note.submittedBy} fallback="Unbekannt" />

      <td>
        <NotesTableActions note={note} />
      </td>
    </TRow>
  );
};

/**
 * The confirmation state of the note, with the decision buttons only for a
 * viewer who may decide about the note
 */
const NoteConfirmationState = async ({ note }: Props) => {
  const authentication = await requireAuthenticationPage();
  const canDecide = await authentication.authorize(
    "note",
    "confirm",
    getNotePermissionAttributes(note),
  );

  return (
    <ConfirmationState
      citizenLog={{
        id: note.id,
        citizenId: note.citizenId,
        confirmed: note.confirmed,
        citizen: { deletedAt: note.citizen.deletedAt },
      }}
      canDecide={canDecide}
    />
  );
};

/**
 * The buttons that change or delete the note, with the permission checks of
 * the notes page of the citizen
 */
const NotesTableActions = async ({ note }: Props) => {
  /** The logs of a deleted citizen are read only */
  if (note.citizen.deletedAt) return null;

  const authentication = await requireAuthenticationPage();
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
