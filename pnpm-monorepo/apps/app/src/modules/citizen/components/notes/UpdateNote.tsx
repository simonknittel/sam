import type { CitizenNote } from "@/modules/citizen/queries/citizenLogTableSelect";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import { UpdateNoteModal } from "./UpdateNoteModal";

/**
 * The options of a select: the values in which the user may create a note,
 * and the current value of the note. Without the current value, the select
 * shows a different value, and a save moves the note without a choice of the
 * user.
 */
const getOptions = <Option extends { readonly id: string }>(
  allOptions: readonly Option[],
  creatableOptions: readonly Option[],
  currentId: string | null,
) =>
  allOptions.filter(
    (option) =>
      option.id === currentId ||
      creatableOptions.some(
        (creatableOption) => creatableOption.id === option.id,
      ),
  );

interface Props {
  readonly note: CitizenNote;
  readonly withBullet?: boolean;
}

export const UpdateNote = async ({ note, withBullet = false }: Props) => {
  /**
   * Only the fields that the dialog reads go to the browser: a row of the
   * notes table also has the content, the citizen and the names of the
   * authors
   */
  const { id, noteTypeId, classificationLevelId } = note;

  const [allNoteTypes, allClassificationLevels] = await Promise.all([
    getAllNoteTypes(),
    getAllClassificationLevels(),
  ]);

  /**
   * The update of a note needs the permission to create a note in the new
   * note type and classification level, with the check of the notes page of
   * a citizen. Thus each note type has its own classification levels, and a
   * different note type without one is no option.
   */
  const noteTypeOptions = (
    await Promise.all(
      allNoteTypes.map(async (noteType) => ({
        noteType,
        classificationLevels: getOptions(
          allClassificationLevels,
          await getCreatableClassificationLevelsDeduped(noteType.id),
          noteType.id === noteTypeId ? classificationLevelId : null,
        ),
      })),
    )
  ).filter(
    ({ noteType, classificationLevels }) =>
      noteType.id === noteTypeId || classificationLevels.length > 0,
  );

  const modal = (
    <UpdateNoteModal
      className={withBullet ? "h-auto self-center" : undefined}
      note={{ id, noteTypeId, classificationLevelId }}
      noteTypes={noteTypeOptions.map(({ noteType }) => noteType)}
      classificationLevels={Object.fromEntries(
        noteTypeOptions.map(({ noteType, classificationLevels }) => [
          noteType.id,
          classificationLevels,
        ]),
      )}
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
