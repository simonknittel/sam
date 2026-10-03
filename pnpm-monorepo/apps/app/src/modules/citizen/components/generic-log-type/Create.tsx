"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { type Citizen } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaSave } from "react-icons/fa";
import { api } from "../../../../trpc/react";
import { type GenericCitizenLogType } from "../../../../types";

interface Props {
  type: GenericCitizenLogType;
  entity: Pick<Citizen, "id">;
}

interface FormValues {
  content: string;
}

export const Create = ({ type, entity }: Readonly<Props>) => {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const inputId = useId();
  const utils = api.useUtils();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/spynet/citizen/${entity.id}/log`, {
        method: "POST",
        body: JSON.stringify({
          type: type,
          content: data.content,
        }),
      });

      if (response.ok) {
        await utils.citizenLog.getHistory.invalidate({
          type: type,
          citizenId: entity.id,
        });
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex">
      <input
        className="flex-1 rounded-l bg-neutral-900 p-2"
        id={inputId}
        {...register("content", { required: true })}
        autoFocus
        placeholder="Neuer Eintrag ..."
      />

      <Button
        type="submit"
        disabled={isLoading}
        className="rounded-l-none"
        title="Speichern"
      >
        {isLoading ? <AsciiSpinner /> : <FaSave />}
      </Button>
    </form>
  );
};
