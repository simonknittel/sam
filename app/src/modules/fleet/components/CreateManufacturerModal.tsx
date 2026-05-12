import { type Manufacturer } from "@/generated/prisma/client";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";

interface Props {
  readonly onRequestClose: () => void;
}

interface FormValues {
  name: Manufacturer["name"];
}

export const CreateManufacturerModal = ({ onRequestClose }: Props) => {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/manufacturer", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich erstellt");
        reset();
        onRequestClose();
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
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-[480px]"
      heading={<h2>Hersteller anlegen</h2>}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="block" htmlFor="name">
          Name
        </label>

        <input
          id="name"
          type="text"
          className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
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
  );
};
