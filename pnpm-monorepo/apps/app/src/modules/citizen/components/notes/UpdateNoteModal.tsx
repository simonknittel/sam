"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import type { CitizenNote } from "@/modules/citizen/queries/citizenLogTableSelect";
import Button from "@/modules/common/components/Button";
import { Select } from "@/modules/common/components/form/Select";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
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
  const { formAction, getDefaultValueWithFallback } = useAction(updateNote, {
    onSuccess: () => setIsOpen(false),
  });
  const noteTypeSelectId = useId();
  const classificationLevelSelectId = useId();

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
        <form action={formAction}>
          <input type="hidden" name="id" value={note.id} />

          <label className="block" htmlFor={noteTypeSelectId}>
            Notizart
          </label>

          <Select
            className="mt-2"
            id={noteTypeSelectId}
            name="noteTypeId"
            defaultValue={getDefaultValueWithFallback(
              "noteTypeId",
              note.noteTypeId ?? undefined,
            )}
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
            defaultValue={getDefaultValueWithFallback(
              "classificationLevelId",
              note.classificationLevelId ?? undefined,
            )}
          >
            {classificationLevels.map((classificationLevel) => (
              <option
                key={classificationLevel.id}
                value={classificationLevel.id}
              >
                {classificationLevel.name}
              </option>
            ))}
          </Select>

          <div className="mt-8 flex justify-end">
            <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
};
