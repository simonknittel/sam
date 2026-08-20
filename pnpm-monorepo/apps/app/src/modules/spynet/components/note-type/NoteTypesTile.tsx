import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { createNoteType } from "../../actions/createNoteType";
import { deleteNoteType } from "../../actions/deleteNoteType";
import { updateNoteType } from "../../actions/updateNoteType";
import { SettingsRecordTile } from "../settings-record/SettingsRecordTile";

interface Props {
  readonly className?: string;
}

const NoteTypesTile = async ({ className }: Props) => {
  const noteTypes = await getAllNoteTypes();

  return (
    <SettingsRecordTile
      className={className}
      heading="Notizarten"
      description="Jeder Notiz kann eine Art zugewiesen werden. Anhand dieser können Berechtigungen vergeben werden."
      emptyLabel="Keine Notizarten vorhanden"
      actions={{
        create: createNoteType,
        update: updateNoteType,
        delete: deleteNoteType,
      }}
      records={noteTypes}
    />
  );
};

export default NoteTypesTile;
