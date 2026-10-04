"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { api } from "@/trpc/react";
import {
  type Variant,
  type VariantExternalLink,
  type VariantTag,
} from "@sam-monorepo/database/browser";
import { useId } from "react";
import { FaSave } from "react-icons/fa";
import { updateVariant } from "../actions/updateVariant";
import { VariantExternalLinkFields } from "./VariantExternalLinkFields";
import { VariantTagFields } from "./VariantTagFields";
import { VariantWikiPageField } from "./VariantWikiPageField";

interface Props {
  readonly onRequestClose: () => void;
  readonly variant: Pick<
    Variant & { tags: VariantTag[]; externalLinks: VariantExternalLink[] },
    "id" | "tags" | "externalLinks"
  >;
}

export const UpdateVariantModal = ({ onRequestClose, variant }: Props) => {
  const _variant = api.variant.getById.useQuery({ id: variant.id });
  const nameId = useId();
  const statusId = useId();

  const _action = async (formData: FormData) => {
    if (await runAction(updateVariant, formData)) onRequestClose();
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
          <div className="mt-2 h-10 animate-pulse rounded-secondary bg-neutral-900" />
        ) : (
          <input
            id={nameId}
            name="name"
            type="text"
            className="mt-2 w-full rounded-secondary bg-neutral-900 p-2"
            required
            autoFocus
            defaultValue={_variant.data?.name}
          />
        )}

        <label className="mt-6 block" htmlFor={statusId}>
          Status
        </label>
        {_variant.isFetching ? (
          <div className="mt-2 h-10 animate-pulse rounded-secondary bg-neutral-900" />
        ) : (
          <select
            id={statusId}
            name="status"
            className="mt-2 w-full rounded-secondary bg-neutral-900 p-2"
            defaultValue={_variant.data?.status || "FLIGHT_READY"}
            required
          >
            <option value="FLIGHT_READY">Flight ready</option>
            <option value="NOT_FLIGHT_READY">Nicht flight ready</option>
          </select>
        )}
        <small className="text-white/40">optional</small>

        <VariantTagFields
          initialTags={variant.tags.map((tag) => ({
            id: tag.id,
            key: tag.key,
            value: tag.value,
          }))}
        />

        <VariantExternalLinkFields
          initialLinks={variant.externalLinks.map((link) => ({
            id: link.id,
            serviceName: link.serviceName,
            url: link.url,
          }))}
        />

        <VariantWikiPageField
          currentWikiPageId={_variant.data?.wikiPageId}
          loading={_variant.isFetching}
        />

        <div className="mt-8 flex justify-end">
          <SubmitButton icon={<FaSave />} disabled={_variant.isFetching}>
            Speichern
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
};
