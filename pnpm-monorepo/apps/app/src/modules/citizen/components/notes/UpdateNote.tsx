import type { CitizenNote } from "@/modules/citizen/queries/citizenLogTableSelect";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import { UpdateNoteModal } from "./UpdateNoteModal";

interface Props {
  readonly note: CitizenNote;
  readonly withBullet?: boolean;
}

export const UpdateNote = async ({ note, withBullet = false }: Props) => {
  const [allNoteTypes, classificationLevels] = await Promise.all([
    getAllNoteTypes(),
    getCreatableClassificationLevelsDeduped(note.noteTypeId!),
  ]);

  const modal = (
    <UpdateNoteModal
      className={withBullet ? "h-auto self-center" : undefined}
      note={note}
      noteTypes={allNoteTypes}
      classificationLevels={classificationLevels}
    />
  );

  if (!withBullet) return modal;

  return (
    <>
      <span>&bull;</span>
      {modal}
    </>
  );
};
