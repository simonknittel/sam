import { requireAuthentication } from "@/modules/auth/server";
import type { CitizenNote } from "@/modules/citizen/queries/citizenLogTableSelect";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import {
  type Citizen,
  type CitizenLog,
  type NoteType,
} from "@sam-monorepo/database/client";
import { AddNote } from "./AddNote";
import { SingleNote } from "./SingleNote";
import SingleNoteRedacted from "./SingleNoteRedacted";

interface Props {
  readonly noteType: NoteType;
  readonly notes: (CitizenNote | { id: CitizenLog["id"]; redacted: true })[];
  readonly entityId: Citizen["id"];
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
        <p className="mt-8 text-neutral-500 italic">Keine Einträge vorhanden</p>
      )}
    </TabPanel>
  );
};
