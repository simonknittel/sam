"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { useState } from "react";
import { FaRegCopy, FaSave } from "react-icons/fa";
import { duplicateEventTemplate } from "../actions/duplicateEventTemplate";
import { EVENT_TEMPLATE_NAME_MAX_LENGTH } from "../utils/eventTemplateConstraints";

interface Props {
  readonly templateId: string;
  readonly name: string;
  /** Renders a labelled button instead of the table's icon-only one */
  readonly withLabel?: boolean;
}

export const DuplicateEventTemplateButton = ({
  templateId,
  name,
  withLabel,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {withLabel ? (
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setIsOpen(true)}
        >
          <FaRegCopy />
          Duplizieren
        </Button2>
      ) : (
        <Button2
          type="button"
          variant={Button2Variant.IconOnly}
          tooltip="Duplizieren"
          onClick={() => setIsOpen(true)}
        >
          <FaRegCopy />
        </Button2>
      )}

      {isOpen && (
        <Modal
          isOpen={true}
          onRequestClose={() => setIsOpen(false)}
          className="w-120"
          heading={<h2>Vorlage duplizieren</h2>}
        >
          <DuplicateEventTemplateForm
            templateId={templateId}
            name={name}
            onSuccess={() => setIsOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

interface FormProps {
  readonly templateId: string;
  readonly name: string;
  readonly onSuccess: () => void;
}

const DuplicateEventTemplateForm = ({
  templateId,
  name,
  onSuccess,
}: FormProps) => {
  /**
   * The errors show as toasts: the refresh after a conflict, for example a
   * template that a different user deleted, can remove this form.
   */
  const { formAction } = useAction(duplicateEventTemplate, {
    onSuccess,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="sourceTemplateId" value={templateId} />

      <p className="mb-4 text-sm text-neutral-400">
        {`Die Kopie übernimmt Beschreibung, Titelbild, Sichtbarkeit, Aufstellung und Briefing von „${name}“, aber keine Freigaben. Sie gehört dir und ist damit zunächst nur für dich sichtbar.`}
      </p>

      <TextInput
        name="name"
        label="Name"
        defaultValue={`${name} (Kopie)`}
        maxLength={EVENT_TEMPLATE_NAME_MAX_LENGTH}
        required
        autoFocus
      />

      <div className="mt-8 flex justify-end">
        <SubmitButton icon={<FaSave />}>Duplizieren</SubmitButton>
      </div>
    </form>
  );
};
