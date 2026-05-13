"use client";

import {
  type ClassificationLevel,
  type EntityLog,
  type EntityLogAttribute,
  type NoteType,
} from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { Select } from "@/modules/common/components/form/Select";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly note: EntityLog & {
    attributes: EntityLogAttribute[];
  };
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
}

interface FormValues {
  noteTypeId: string;
  classificationLevelId: string;
}

export const UpdateNoteModal = ({
  className,
  note,
  noteTypes = [],
  classificationLevels = [],
}: Props) => {
  const { noteTypeId, classificationLevelId } = getLatestNoteAttributes(note);

  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      noteTypeId: noteTypeId?.value,
      classificationLevelId: classificationLevelId?.value,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const noteTypeSelectId = useId();
  const classificationLevelSelectId = useId();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/spynet/citizen/${note.entityId}/log/${note.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            noteTypeId: data.noteTypeId,
            classificationLevelId: data.classificationLevelId,
          }),
        },
      );

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich gespeichert");
        setIsOpen(false);
      } else {
        toast.error("Beim Speichern ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Speichern ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

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
        className="w-[480px]"
        heading={<h2>Bearbeiten</h2>}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="block" htmlFor={noteTypeSelectId}>
            Notizart
          </label>

          <Select
            className="mt-2"
            id={noteTypeSelectId}
            {...register("noteTypeId")}
          >
            {noteTypes.map((noteTye) => (
              <option key={noteTye.id} value={noteTye.id}>
                {noteTye.name}
              </option>
            ))}
          </Select>

          <label className="mt-4 block" htmlFor={classificationLevelSelectId}>
            Geheimhaltungsstufe
          </label>

          <Select
            className="mt-2"
            id={classificationLevelSelectId}
            {...register("classificationLevelId")}
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

          <div className="flex justify-end mt-8">
            <Button2 type="submit" disabled={isLoading}>
              {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Speichern
            </Button2>
          </div>
        </form>
      </Modal>
    </>
  );
};
