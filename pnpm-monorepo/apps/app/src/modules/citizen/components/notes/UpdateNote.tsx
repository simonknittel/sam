import type { CitizenNote } from "@/modules/citizen/queries/entityLogTableSelect";
import getLatestNoteAttributes from "@/modules/citizen/utils/getLatestNoteAttributes";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import { UpdateNoteModal } from "./UpdateNoteModal";

interface Props {
  readonly note: CitizenNote;
  readonly withBullet?: boolean;
}

export const UpdateNote = async ({ note, withBullet = false }: Props) => {
  const { noteTypeId } = getLatestNoteAttributes(note);

  const [allNoteTypes, classificationLevels] = await Promise.all([
    getAllNoteTypes(),
    getCreatableClassificationLevelsDeduped(noteTypeId!.value),
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
