import { type Manufacturer, type Series } from "@/generated/prisma/client";
import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";

interface Props {
  readonly onRequestClose: () => void;
  readonly manufacturerId?: Manufacturer["id"];
}

interface FormValues {
  manufacturerId: Manufacturer["id"];
  name: Series["name"];
}

export const CreateSeriesModal = ({
  onRequestClose,
  manufacturerId,
}: Props) => {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      manufacturerId,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const manufacturers = api.manufacturer.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/series", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          manufacturerId: data.manufacturerId,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich gespeichert");
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
      heading={<h2>Serie anlegen</h2>}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="block" htmlFor="manufacturerId">
          Hersteller
        </label>

        {manufacturers.isFetching ? (
          <div className="p-2 rounded-secondary bg-neutral-900 w-full mt-2 animate-pulse h-10" />
        ) : (
          <select
            id="manufacturerId"
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            {...register("manufacturerId", { required: true })}
            defaultValue={manufacturerId}
            autoFocus={!Boolean(manufacturerId)}
            disabled={Boolean(manufacturerId)}
          >
            {manufacturers.data?.map((manufacturer) => (
              <option key={manufacturer.id} value={manufacturer.id}>
                {manufacturer.name}
              </option>
            ))}
          </select>
        )}

        <label className="block mt-4" htmlFor="name">
          Name
        </label>

        <input
          id="name"
          type="text"
          className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
          {...register("name", { required: true })}
          autoFocus={Boolean(manufacturerId)}
        />

        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            disabled={isLoading || manufacturers.isFetching}
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
};
