"use client";

import {
  type Variant,
  type VariantExternalLink,
  type VariantTag,
} from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { api } from "@/trpc/react";
import { createId } from "@paralleldrive/cuid2";
import { unstable_rethrow } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "react-hot-toast";
import { FaPlus, FaSave, FaSpinner, FaTrash } from "react-icons/fa";
import { updateVariant } from "../actions/updateVariant";
import { ExternalService, ExternalServiceDisplayNames } from "../types";

interface Props {
  readonly onRequestClose: () => void;
  readonly variant: Pick<
    Variant & { tags: VariantTag[]; externalLinks: VariantExternalLink[] },
    "id" | "tags" | "externalLinks"
  >;
}

export const UpdateVariantModal = ({ onRequestClose, variant }: Props) => {
  const _variant = api.variant.getById.useQuery(
    { id: variant.id },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const [isPending, startTransition] = useTransition();
  const nameId = useId();
  const statusId = useId();
  const [tags, setTags] = useState<
    { id: string; key: string; value: string }[]
  >(
    variant.tags.map((tag) => ({
      id: tag.id,
      key: tag.key,
      value: tag.value,
    })),
  );
  const [externalLinks, setExternalLinks] = useState<
    Pick<VariantExternalLink, "id" | "serviceName" | "url">[]
  >(
    variant.externalLinks.map((link) => ({
      id: link.id,
      serviceName: link.serviceName,
      url: link.url,
    })),
  );

  const _action = (formData: FormData) => {
    startTransition(async () => {
      try {
        const response = await updateVariant(formData);

        if (response.status === 200) {
          toast.success("Erfolgreich gespeichert");
          onRequestClose();
        } else {
          toast.error(
            response.errorMessage ||
              "Beim Speichern ist ein Fehler aufgetreten.",
          );
        }
      } catch (error) {
        unstable_rethrow(error);
        toast.error("Beim Speichern ist ein Fehler aufgetreten.");
        console.error(error);
      }
    });
  };

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Variante bearbeiten</h2>}
    >
      <form action={_action}>
        <input type="hidden" name="id" value={variant.id} />

        <label className="block" htmlFor={nameId}>
          Name
        </label>
        {_variant.isFetching ? (
          <div className="rounded-secondary bg-neutral-900 mt-2 h-10 animate-pulse " />
        ) : (
          <input
            id={nameId}
            name="name"
            type="text"
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            required
            autoFocus
            defaultValue={_variant.data?.name}
          />
        )}

        <label className="mt-6 block" htmlFor={statusId}>
          Status
        </label>
        {_variant.isFetching ? (
          <div className="rounded-secondary bg-neutral-900 mt-2 h-10 animate-pulse " />
        ) : (
          <select
            id={statusId}
            name="status"
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            defaultValue={_variant.data?.status || "FLIGHT_READY"}
            required
          >
            <option value="FLIGHT_READY">Flight ready</option>
            <option value="NOT_FLIGHT_READY">Nicht flight ready</option>
          </select>
        )}
        <small className="text-white/40">optional</small>

        <p className="mt-6">
          Tags <small className="text-white/40">optional</small>
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

        <p className="mt-6">
          Externe Links <small className="text-white/40">optional</small>
        </p>
        <div className="flex flex-col gap-2 mt-2">
          {externalLinks.map((link) => (
            <div key={link.id} className="flex gap-1 items-stretch">
              <select
                className="p-2 rounded-secondary bg-neutral-900 flex-none min-w-0"
                name="linkServiceNames[]"
                defaultValue={link.serviceName}
              >
                {Object.entries(ExternalServiceDisplayNames).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              <input
                type="url"
                className="p-2 rounded-secondary bg-neutral-900 flex-1 min-w-0"
                name="linkUrls[]"
                placeholder="https://..."
                defaultValue={link.url}
              />
              <Button
                onClick={() =>
                  setExternalLinks((prev) =>
                    prev.filter(({ id }) => id !== link.id),
                  )
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
            setExternalLinks((prev) => [
              ...prev,
              {
                id: createId(),
                serviceName: ExternalService.SPVIEWER,
                url: "",
              },
            ])
          }
          type="button"
          variant="tertiary"
          className="mx-auto"
        >
          <FaPlus />
          Hinzufügen
        </Button>

        <div className="flex justify-end mt-8">
          <Button2 disabled={isPending || _variant.isFetching} type="submit">
            {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
          </Button2>
        </div>
      </form>
    </Modal>
  );
};
