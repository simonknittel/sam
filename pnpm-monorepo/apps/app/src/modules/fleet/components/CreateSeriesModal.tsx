import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { api } from "@/trpc/react";
import { type Manufacturer, type Series } from "@sam-monorepo/database/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "react-hot-toast";
import { FaSave } from "react-icons/fa";

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
  const manufacturers = api.manufacturer.getAll.useQuery(undefined);

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
      className="w-120"
      heading={<h2>Serie anlegen</h2>}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="block" htmlFor="manufacturerId">
          Hersteller
        </label>

        {manufacturers.isFetching ? (
          <div className="mt-2 h-10 w-full animate-pulse rounded-secondary bg-neutral-900 p-2" />
        ) : (
          <select
            id="manufacturerId"
            className="mt-2 w-full rounded-secondary bg-neutral-900 p-2"
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

        <label className="mt-4 block" htmlFor="name">
          Name
        </label>

        <input
          id="name"
          type="text"
          className="mt-2 w-full rounded-secondary bg-neutral-900 p-2"
          {...register("name", { required: true })}
          autoFocus={Boolean(manufacturerId)}
        />

        <div className="mt-4 flex justify-end">
          <Button
            type="submit"
            disabled={isLoading || manufacturers.isFetching}
          >
            {isLoading ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
};
