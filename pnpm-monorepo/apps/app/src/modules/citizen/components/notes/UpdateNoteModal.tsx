"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import type { CitizenNote } from "@/modules/citizen/queries/citizenLogTableSelect";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import Modal from "@/modules/common/components/Modal";
import {
  type ClassificationLevel,
  type NoteType,
} from "@sam-monorepo/database/browser";
import { useId, useState } from "react";
import { FaPen, FaSave } from "react-icons/fa";
import { updateNote } from "../../actions/updateNote";

/** The classification levels that the dialog offers for each note type */
type ClassificationLevelsByNoteType = Readonly<
  Partial<Record<NoteType["id"], readonly ClassificationLevel[]>>
>;

interface Props {
  readonly className?: string;
  readonly note: Pick<
    CitizenNote,
    "id" | "noteTypeId" | "classificationLevelId"
  >;
  readonly noteTypes: readonly NoteType[];
  readonly classificationLevels: ClassificationLevelsByNoteType;
}

export const UpdateNoteModal = ({
  className,
  note,
  noteTypes,
  classificationLevels,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        type="button"
        className={className}
        variant="tertiary"
      >
        <FaPen /> Bearbeiten
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Bearbeiten</h2>}
      >
        <UpdateNoteForm
          note={note}
          noteTypes={noteTypes}
          classificationLevels={classificationLevels}
          onSuccess={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
};

interface UpdateNoteFormProps {
  readonly note: Pick<
    CitizenNote,
    "id" | "noteTypeId" | "classificationLevelId"
  >;
  readonly noteTypes: readonly NoteType[];
  readonly classificationLevels: ClassificationLevelsByNoteType;
  readonly onSuccess: () => void;
}

/**
 * The value of a controlled select. A value that the select does not offer,
 * for example after a refresh or after a change of the note type, changes to
 * the first option, as the browser shows it.
 */
const getOfferedValue = (
  options: readonly { readonly id: string }[],
  value: string,
) =>
  options.some((option) => option.id === value)
    ? value
    : (options.at(0)?.id ?? "");

/**
 * The closed modal does not render the form, thus each open starts with the
 * current values of the note
 */
const UpdateNoteForm = ({
  note,
  noteTypes,
  classificationLevels,
  onSuccess,
}: UpdateNoteFormProps) => {
  const { isPending, submitWithoutReset } = useAction(updateNote, {
    onSuccess,
  });
  const noteTypeSelectId = useId();
  const classificationLevelSelectId = useId();

  /**
   * Controlled, because the selected note type sets the options of the
   * classification level
   */
  const [noteTypeId, setNoteTypeId] = useState(note.noteTypeId ?? "");
  const [classificationLevelId, setClassificationLevelId] = useState(
    note.classificationLevelId ?? "",
  );
  const selectedNoteTypeId = getOfferedValue(noteTypes, noteTypeId);
  const classificationLevelOptions =
    classificationLevels[selectedNoteTypeId] ?? [];
  const selectedClassificationLevelId = getOfferedValue(
    classificationLevelOptions,
    classificationLevelId,
  );
  /**
   * A save without a change does not change the note, and a save without a
   * classification level fails
   */
  const isSaveDisabled =
    !selectedClassificationLevelId ||
    (selectedNoteTypeId === note.noteTypeId &&
      selectedClassificationLevelId === note.classificationLevelId);

  return (
    <form onSubmit={submitWithoutReset}>
      <input type="hidden" name="id" value={note.id} />

      <label className="block" htmlFor={noteTypeSelectId}>
        Notizart
      </label>

      <Select
        className="mt-2"
        id={noteTypeSelectId}
        name="noteTypeId"
        value={selectedNoteTypeId}
        onChange={(event) => setNoteTypeId(event.target.value)}
      >
        {noteTypes.map((noteType) => (
          <option key={noteType.id} value={noteType.id}>
            {noteType.name}
          </option>
        ))}
      </Select>

      <label className="mt-4 block" htmlFor={classificationLevelSelectId}>
        Geheimhaltungsstufe
      </label>

      <Select
        className="mt-2"
        id={classificationLevelSelectId}
        name="classificationLevelId"
        value={selectedClassificationLevelId}
        onChange={(event) => setClassificationLevelId(event.target.value)}
      >
        {classificationLevelOptions.map((classificationLevel) => (
          <option key={classificationLevel.id} value={classificationLevel.id}>
            {classificationLevel.name}
          </option>
        ))}
      </Select>

      <div className="mt-8 flex justify-end">
        <Button2 type="submit" disabled={isPending || isSaveDisabled}>
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>
      </div>
    </form>
  );
};
