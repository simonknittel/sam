"use client";

import {
  type Manufacturer,
  type Series,
  type Ship,
  type Variant,
} from "@/generated/prisma/browser";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";

interface Props {
  isOpen: boolean;
  onRequestClose: () => void;
  ship: Ship & {
    variant: Variant & {
      series: Series & {
        manufacturer: Manufacturer;
      };
    };
  };
}

interface FormValues {
  name: string;
}

const EditShipModal = ({ isOpen, onRequestClose, ship }: Readonly<Props>) => {
  const router = useRouter();
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: ship.name || "",
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const selectId = useId();
  const inputId = useId();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/ship/${ship.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich bearbeitet");
        onRequestClose();
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
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="w-[480px]"
      heading={<h2>Schiff bearbeiten</h2>}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="block" htmlFor={selectId}>
          Schiff
        </label>

        <select
          id={selectId}
          className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
          disabled
        >
          <option>{ship.variant.name}</option>
        </select>

        <label className="mt-4 block" htmlFor={inputId}>
          Name
        </label>

        <input
          className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
          id={inputId}
          {...register("name")}
          autoFocus
        />

        <p className="mt-2 text-neutral-500">optional</p>

        <div className="flex justify-end mt-8">
          <Button2 type="submit" disabled={isLoading}>
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
          </Button2>
        </div>
      </form>
    </Modal>
  );
};

export default EditShipModal;
