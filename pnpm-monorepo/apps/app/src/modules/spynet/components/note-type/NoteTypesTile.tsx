import { Actions } from "@/modules/common/components/Actions";
import { Tile } from "@/modules/common/components/Tile";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import Create from "./Create";
import Delete from "./Delete";
import Update from "./Update";

interface Props {
  className?: string;
}

const NoteTypesTile = async ({ className }: Readonly<Props>) => {
  const noteTypes = await getAllNoteTypes();

  const sortedNoteTypes = noteTypes.toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Tile heading="Notizarten" cta={<Create />} className={className}>
      <p className="mb-4 text-sm">
        Jeder Notiz kann eine Art zugewiesen werden. Anhand dieser können
        Berechtigungen vergeben werden.
      </p>

      {sortedNoteTypes.map((noteType) => (
        <div
          key={noteType.id}
          className="flex justify-between gap-2 py-2 items-center"
        >
          <div className="flex flex-col">
            <p className="font-bold">{noteType.name}</p>
            <p className="text-neutral-500 text-sm">{noteType.id}</p>
          </div>

          <div className="flex gap-4 items-center">
            <Actions>
              <Update noteType={noteType} />
              <Delete noteType={noteType} />
            </Actions>
          </div>
        </div>
      ))}

      {sortedNoteTypes.length <= 0 && (
        <p className="text-neutral-500 italic">Keine Notizarten vorhanden</p>
      )}
    </Tile>
  );
};

export default NoteTypesTile;
