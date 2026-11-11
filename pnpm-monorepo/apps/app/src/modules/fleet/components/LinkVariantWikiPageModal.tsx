"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { WikiPageSelect } from "@/modules/wiki/components/WikiPageSelect";
import { api } from "@/trpc/react";
import { useId } from "react";
import { FaLink } from "react-icons/fa";
import { linkVariantWikiPage } from "../actions/linkVariantWikiPage";

interface Props {
  readonly variantId: string;
  readonly onRequestClose: () => void;
}

/** Links a page of the global wiki that the user can read to the variant */
export const LinkVariantWikiPageModal = ({
  variantId,
  onRequestClose,
}: Props) => {
  const selectId = useId();
  const targets = api.wiki.getPageTargets.useQuery(
    { permission: "read" },
    { gcTime: 0 },
  );
  const { formAction } = useAction(linkVariantWikiPage, {
    onSuccess: onRequestClose,
  });

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Wiki-Seite verknüpfen</h2>}
    >
      <form action={formAction}>
        <input type="hidden" name="variantId" value={variantId} />

        <label className="block" htmlFor={selectId}>
          Wiki-Seite
        </label>
        {targets.data ? (
          <WikiPageSelect
            id={selectId}
            name="wikiPageId"
            className="mt-2"
            targets={targets.data}
            emptyOptionLabel="Seite auswählen"
            defaultValue=""
            required
          />
        ) : (
          <div className="mt-2 h-10 animate-pulse rounded-secondary bg-neutral-900" />
        )}
        <small className="text-white/40">
          Die Seite wird mit ihren Unterseiten auf der Variantenseite
          eingebettet.
        </small>

        <div className="mt-8 flex justify-end">
          <SubmitButton icon={<FaLink />} disabled={!targets.data}>
            Verknüpfen
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
};
