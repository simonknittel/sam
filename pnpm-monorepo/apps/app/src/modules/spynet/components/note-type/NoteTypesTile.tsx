import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
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
      apiPath="/api/note-type"
      records={noteTypes}
    />
  );
};

export default NoteTypesTile;
