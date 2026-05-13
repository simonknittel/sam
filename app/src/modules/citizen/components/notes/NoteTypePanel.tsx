import {
  type Entity,
  type EntityLog,
  type EntityLogAttribute,
  type NoteType,
} from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import { AddNote } from "./AddNote";
import { SingleNote } from "./SingleNote";
import SingleNoteRedacted from "./SingleNoteRedacted";

interface Props {
  readonly noteType: NoteType;
  readonly notes: (
    | (EntityLog & {
        attributes: EntityLogAttribute[];
      })
    | { id: EntityLog["id"]; redacted: true }
  )[];
  readonly entityId: Entity["id"];
}

export const NoteTypePanel = async ({ noteType, notes, entityId }: Props) => {
  const [authentication, classificationLevels] = await Promise.all([
    requireAuthentication(),
    getCreatableClassificationLevelsDeduped(noteType.id),
  ]);

  const showAddNote = await authentication.authorize("note", "create", [
    {
      key: "noteTypeId",
      value: noteType.id,
    },
  ]);

  return (
    <TabPanel id={noteType.id}>
      {showAddNote && (
        <AddNote
          entityId={entityId}
          noteTypeId={noteType.id}
          classificationLevels={classificationLevels}
        />
      )}

      {notes.map((note) => {
        if ("redacted" in note) return <SingleNoteRedacted key={note.id} />;
        return <SingleNote key={note.id} note={note} />;
      })}

      {notes.length <= 0 && (
        <p className="text-neutral-500 italic mt-8">Keine Einträge vorhanden</p>
      )}
    </TabPanel>
  );
};
