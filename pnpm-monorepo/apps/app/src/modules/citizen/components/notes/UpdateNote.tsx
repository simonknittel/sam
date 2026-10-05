import { requireAuthentication } from "@/modules/auth/server";
import type { CitizenNote } from "@/modules/citizen/queries/citizenLogTableSelect";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import { getCreatableClassificationLevelsDeduped } from "@/modules/spynet/utils/getAllClassificationLevels";
import { cache } from "react";
import { UpdateNoteModal } from "./UpdateNoteModal";

/**
 * The note types in which the user may create a note, with the check of the
 * notes page of a citizen. The update of a note needs the same permission
 * for the new note type.
 */
const getCreatableNoteTypesDeduped = cache(async () => {
  const [authentication, allNoteTypes] = await Promise.all([
    requireAuthentication(),
    getAllNoteTypes(),
  ]);

  const isCreatable = await Promise.all(
    allNoteTypes.map((noteType) =>
      authentication.authorize("note", "create", [
        { key: "noteTypeId", value: noteType.id },
      ]),
    ),
  );

  return allNoteTypes.filter((noteType, index) => isCreatable[index]);
});

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
  const [
    allNoteTypes,
    creatableNoteTypes,
    allClassificationLevels,
    creatableClassificationLevels,
  ] = await Promise.all([
    getAllNoteTypes(),
    getCreatableNoteTypesDeduped(),
    getAllClassificationLevels(),
    getCreatableClassificationLevelsDeduped(note.noteTypeId!),
  ]);

  /**
   * Only the columns of the note go to the browser: a row of the notes table
   * also has the citizen and the names of the authors
   */
  const {
    id,
    citizenId,
    type,
    content,
    createdAt,
    confirmed,
    noteTypeId,
    classificationLevelId,
  } = note;

  const modal = (
    <UpdateNoteModal
      className={withBullet ? "h-auto self-center" : undefined}
      note={{
        id,
        citizenId,
        type,
        content,
        createdAt,
        confirmed,
        noteTypeId,
        classificationLevelId,
      }}
      noteTypes={getOptions(allNoteTypes, creatableNoteTypes, noteTypeId)}
      classificationLevels={getOptions(
        allClassificationLevels,
        creatableClassificationLevels,
        classificationLevelId,
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
