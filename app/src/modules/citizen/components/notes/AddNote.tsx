"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import {
  type ClassificationLevel,
  type Entity,
  type NoteType,
} from "@prisma/client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";
import { Formatting } from "./Formatting";

interface Props {
  readonly entityId: Entity["id"];
  readonly noteTypeId: NoteType["id"];
  readonly classificationLevels: ClassificationLevel[];
}

interface FormValues {
  content: string;
  classificationLevelId: ClassificationLevel["id"];
}

export const AddNote = ({
  entityId,
  noteTypeId,
  classificationLevels,
}: Props) => {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const contentInputId = useId();
  const classificationLevelSelectId = useId();

  const onSubmit: SubmitHandler<FormValues> = async (data, e) => {
    setIsLoading(true);

    if (
      !(e?.nativeEvent instanceof SubmitEvent) ||
      !(e.nativeEvent.submitter instanceof HTMLButtonElement)
    )
      return;

    try {
      const response = await fetch(`/api/spynet/citizen/${entityId}/log`, {
        method: "POST",
        body: JSON.stringify({
          type: "note",
          content: data.content,
          noteTypeId,
          classificationLevelId: data.classificationLevelId,
          confirmed:
            e.nativeEvent.submitter.name === "confirmed"
              ? "confirmed"
              : undefined,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich gespeichert");
        reset();
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex justify-end mb-1">
        <Formatting />
      </div>

      <textarea
        className="p-2 rounded-l bg-neutral-800 w-full"
        id={contentInputId}
        {...register("content", { required: true })}
      />

      <div className="grid grid-cols-3 gap-1 mt-1">
        {classificationLevels.length > 1 && (
          <Select
            id={classificationLevelSelectId}
            {...register("classificationLevelId", { required: true })}
            className="!bg-neutral-800"
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
        )}

        {classificationLevels.length === 1 && classificationLevels[0] && (
          <input
            type="hidden"
            {...register("classificationLevelId", {
              value: classificationLevels[0].id,
            })}
          />
        )}

        <div className="flex gap-4 items-center justify-end col-start-3">
          {/* <Button
            type="submit"
            disabled={isLoading}
            title="Speichern"
            variant="tertiary"
            name="confirmed"
            className="whitespace-nowrap text-left hidden sm:inline-flex"
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern und
            <br />
            bestätigen
          </Button> */}

          <Button2
            type="submit"
            disabled={isLoading}
            title="Speichern"
            variant={Button2Variant.Secondary}
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
          </Button2>
        </div>
      </div>
    </form>
  );
};
