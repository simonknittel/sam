"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaPlus, FaSave, FaSpinner } from "react-icons/fa";

interface FormValues {
  name: string;
}

interface Props {
  className?: string;
}

const Create = ({ className }: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const inputId = useId();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/note-type`, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich hinzugefügt");
        reset();
        setIsOpen(false);
      } else {
        toast.error("Beim Hinzufügen ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Hinzufügen ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <>
      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
      >
        <FaPlus />
        Hinzufügen
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
        heading={<h2>Hinzufügen</h2>}
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

export default Create;
