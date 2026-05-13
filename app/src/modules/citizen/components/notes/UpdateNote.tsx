import {
  type EntityLog,
  type EntityLogAttribute,
} from "@/generated/prisma/client";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import { getAllNoteTypes } from "@/modules/spynet/queries";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import { UpdateNoteModal } from "./UpdateNoteModal";

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
    <>
      <span>&bull;</span>
      <UpdateNoteModal
        className="h-auto self-center"
        note={note}
        noteTypes={allNoteTypes}
        classificationLevels={classificationLevels}
      />
    </>
  );
};
