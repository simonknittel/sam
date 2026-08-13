import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import {
  type EntityLog,
  type EntityLogAttribute,
} from "@sam-monorepo/database/client";
import { UpdateNoteModal } from "./UpdateNoteModal";

interface Props {
  readonly note: EntityLog & {
    attributes: EntityLogAttribute[];
  };
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
