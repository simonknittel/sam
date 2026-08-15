"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { api } from "@/trpc/react";
import { type Manufacturer, type Series } from "@sam-monorepo/database/browser";
import { useId, useTransition } from "react";
import { FaSave } from "react-icons/fa";
import { createVariant } from "../actions/createVariant";
import { VariantExternalLinkFields } from "./VariantExternalLinkFields";
import { VariantTagFields } from "./VariantTagFields";
import { VariantWikiPageField } from "./VariantWikiPageField";

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
      if (await runAction(createVariant, formData)) onRequestClose();
    });
  };

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
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
        <small className="text-white/40">optional</small>

        <VariantTagFields />

        <VariantExternalLinkFields />

        <VariantWikiPageField />

        <div className="flex justify-end mt-8">
          <Button
            type="submit"
            disabled={isPending || manufacturer.isFetching || series.isFetching}
          >
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
};
