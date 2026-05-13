"use client";

import { type NoteType } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";

interface FormValues {
  name: string;
}

interface Props {
  className?: string;
  noteType: NoteType;
}

const Update = ({ className, noteType }: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  const router = useRouter();
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: noteType.name,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const inputId = useId();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/note-type/${noteType.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich bearbeitet");
        setIsOpen(false);
      } else {
        toast.error("Beim Bearbeiten ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Bearbeiten ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <>
      <Button
        variant="tertiary"
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
      >
        <FaPen />
        Bearbeiten
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
        heading={<h2>Bearbeiten</h2>}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="block" htmlFor={inputId}>
            Name
          </label>

          <input
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            id={inputId}
            {...register("name", { required: true })}
            autoFocus
          />

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

export default Update;
