import { UpdateNoteModal } from "@/modules/citizen/components/notes/UpdateNoteModal";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import {
  type EntityLog,
  type EntityLogAttribute,
} from "@sam-monorepo/database/client";

interface Props {
  readonly note: EntityLog & {
    attributes: EntityLogAttribute[];
  };
}

export const UpdateNote = async ({ note }: Props) => {
  const { noteTypeId } = getLatestNoteAttributes(note);

  const [allNoteTypes, classificationLevels] = await Promise.all([
    getAllNoteTypes(),
    getCreatableClassificationLevelsDeduped(noteTypeId!.value),
  ]);

  return (
    <UpdateNoteModal
      note={note}
      noteTypes={allNoteTypes}
      classificationLevels={classificationLevels}
    />
  );
};
