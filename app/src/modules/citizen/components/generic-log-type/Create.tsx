"use client";

import { type Entity } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";
import { api } from "../../../../trpc/react";
import { type GenericEntityLogType } from "../../../../types";

interface Props {
  type: GenericEntityLogType;
  entity: Entity;
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
        await utils.entityLog.getHistory.invalidate({
          type: type,
          entityId: entity.id,
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
        className="p-2 rounded-l bg-neutral-900 flex-1"
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
        {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
      </Button>
    </form>
  );
};
