"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SLUG_MAX_LENGTH, slugify } from "@/modules/common/utils/slugify";
import { useId, useState } from "react";
import { FaSave } from "react-icons/fa";
import { createFlow } from "../actions/createFlow";
import { duplicateFlow } from "../actions/duplicateFlow";
import { FLOW_NAME_MAX_LENGTH } from "../utils/flowSlug";

export interface DuplicationSource {
  readonly id: string;
  readonly name: string;
}

interface Props {
  readonly onRequestClose: () => void;
  /**
   * Set when duplicating an existing flow: prefills name and slug and sends
   * the form to the duplicate action instead of the create action.
   */
  readonly source?: DuplicationSource | null;
}

/**
 * Creates a flow, or duplicates one — the two differ only in what the form
 * starts with and which action it posts to, so they share this modal and
 * with it the identical name and slug validation.
 */
export const CreateFlowModal = ({ onRequestClose, source }: Props) => {
  const initialName = source ? `${source.name} (Kopie)` : "";

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(() => slugify(initialName));
  /** The slug follows the name until the user takes it over */
  const [isSlugEdited, setIsSlugEdited] = useState(false);

  const nameInputId = useId();
  const slugInputId = useId();

  const { state, formAction, isPending } = useAction(
    source ? duplicateFlow : createFlow,
    {
      errorToast: false,
      onSuccess: onRequestClose,
    },
  );

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isSlugEdited) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setIsSlugEdited(true);
    setSlug(value);
  };

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={
        <h2>{source ? "Karrierebaum duplizieren" : "Karrierebaum anlegen"}</h2>
      }
    >
      <form action={formAction}>
        {source && (
          <input type="hidden" name="sourceFlowId" value={source.id} />
        )}

        {source && (
          <p className="mb-4 text-sm text-neutral-400">
            Die Kopie übernimmt alle Knoten und Verbindungen von „{source.name}
            “, aber keine Berechtigungen. Sie ist damit zunächst nur für
            Verwaltende sichtbar.
          </p>
        )}

        <TextInput
          id={nameInputId}
          name="name"
          label="Name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          maxLength={FLOW_NAME_MAX_LENGTH}
          required
          autoFocus
        />

        <TextInput
          id={slugInputId}
          name="slug"
          label="Slug"
          className="mt-4"
          hint={`Teil der URL: /app/career/${slug || "…"}`}
          value={slug}
          onChange={(event) => handleSlugChange(event.target.value)}
          maxLength={SLUG_MAX_LENGTH}
          required
        />

        <ActionErrorNote className="mt-4" state={state} />

        <div className="flex justify-end mt-8">
          <Button2 type="submit" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>
        </div>
      </form>
    </Modal>
  );
};
