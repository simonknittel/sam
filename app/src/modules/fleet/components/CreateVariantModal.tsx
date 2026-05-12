import { type Manufacturer, type Series } from "@/generated/prisma/client";
import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { api } from "@/trpc/react";
import { createId } from "@paralleldrive/cuid2";
import { unstable_rethrow } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "react-hot-toast";
import { FaPlus, FaSave, FaSpinner, FaTrash } from "react-icons/fa";
import { createVariant } from "../actions/createVariant";

interface Props {
  readonly onRequestClose: () => void;
  readonly manufacturerId: Manufacturer["id"];
  readonly seriesId: Series["id"];
}

export const CreateVariantModal = ({
  onRequestClose,
  manufacturerId,
  seriesId,
}: Props) => {
  const [isPending, startTransition] = useTransition();
  const nameField = useId();
  const [tags, setTags] = useState<
    { id: string; key: string; value: string }[]
  >([]);

  const manufacturer = api.manufacturer.getById.useQuery(
    {
      id: manufacturerId,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const series = api.manufacturer.getSeriesByManufacturerId.useQuery(
    {
      manufacturerId,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      try {
        const response = await createVariant(formData);

        if (response.success) {
          toast.success(response.success);
          onRequestClose();
        } else {
          toast.error(response.error!);
          console.error(response.error);
        }
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  };

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-[480px]"
      heading={<h2>Variante anlegen</h2>}
    >
      <form action={formAction}>
        <label className="block">Hersteller</label>
        {manufacturer.isFetching ? (
          <div className="rounded-secondary bg-neutral-900 mt-2 animate-pulse h-10" />
        ) : (
          <>
            <p className="p-2 rounded-secondary bg-neutral-900 w-full mt-2 opacity-50">
              {manufacturer.data?.name || "???"}
            </p>
            <input
              type="hidden"
              defaultValue={manufacturerId}
              name="manufacturerId"
            />
          </>
        )}

        <label className="block mt-4">Serie</label>
        {series.isFetching ? (
          <div className="rounded-secondary bg-neutral-900 mt-2 animate-pulse h-10" />
        ) : (
          <>
            <p className="p-2 rounded-secondary bg-neutral-900 w-full mt-2 opacity-50">
              {series.data?.find((series) => series.id === seriesId)?.name ||
                "???"}
            </p>
            <input type="hidden" defaultValue={seriesId} name="seriesId" />
          </>
        )}

        <label className="mt-6 block" htmlFor={nameField}>
          Name
        </label>
        {series.isFetching ? (
          <div className="rounded-secondary bg-neutral-900 mt-2 animate-pulse h-10" />
        ) : (
          <input
            autoFocus
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            defaultValue={
              series.data?.find((singleSeries) => singleSeries.id === seriesId)
                ?.name || ""
            }
            id={nameField}
            name="name"
            required
            type="text"
          />
        )}

        <label className="mt-6 block" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
          name="status"
        >
          <option value="FLIGHT_READY">Flight ready</option>
          <option value="NOT_FLIGHT_READY">Nicht flight ready</option>
        </select>
        <small className="text-neutral-500">optional</small>

        <p className="mt-6">
          Tags <small className="text-neutral-500">optional</small>
        </p>
        <div className="flex flex-col gap-2 mt-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex gap-1 items-stretch">
              <input
                type="text"
                className="p-2 rounded-secondary bg-neutral-900 flex-1 min-w-0"
                name="tagKeys[]"
                placeholder="Key"
                defaultValue={tag.key}
                autoFocus={Boolean(!tag.key)}
              />
              <input
                type="text"
                className="p-2 rounded-secondary bg-neutral-900 flex-1 min-w-0"
                name="tagValues[]"
                placeholder="Value"
                defaultValue={tag.value}
              />
              <Button
                onClick={() =>
                  setTags((prev) => prev.filter(({ id }) => id !== tag.id))
                }
                type="button"
                variant="tertiary"
                title="Löschen"
                iconOnly
                className="h-auto flex-none w-6"
              >
                <FaTrash />
              </Button>
            </div>
          ))}
        </div>
        <Button
          onClick={() =>
            setTags((prev) => [...prev, { id: createId(), key: "", value: "" }])
          }
          type="button"
          variant="tertiary"
          className="mx-auto"
        >
          <FaPlus />
          Hinzufügen
        </Button>

        <div className="flex justify-end mt-8">
          <Button
            type="submit"
            disabled={isPending || manufacturer.isFetching || series.isFetching}
          >
            {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
};
