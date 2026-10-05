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

interface Props {
  readonly className?: string;
  readonly note: CitizenNote;
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
}

export const UpdateNoteModal = ({
  className,
  note,
  noteTypes = [],
  classificationLevels = [],
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
  readonly note: CitizenNote;
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
  readonly onSuccess: () => void;
}

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
        defaultValue={note.noteTypeId ?? undefined}
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
        defaultValue={note.classificationLevelId ?? undefined}
      >
        {classificationLevels.map((classificationLevel) => (
          <option key={classificationLevel.id} value={classificationLevel.id}>
            {classificationLevel.name}
          </option>
        ))}
      </Select>

      <div className="mt-8 flex justify-end">
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>
      </div>
    </form>
  );
};
