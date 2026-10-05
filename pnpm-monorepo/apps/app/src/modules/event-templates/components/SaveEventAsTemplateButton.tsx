"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { useState } from "react";
import { FaRegSave, FaSave } from "react-icons/fa";
import { createEventTemplateFromEvent } from "../actions/createEventTemplateFromEvent";
import { EVENT_TEMPLATE_NAME_MAX_LENGTH } from "../utils/eventTemplateConstraints";

interface Props {
  readonly eventId: string;
  readonly name: string;
}

export const SaveEventAsTemplateButton = ({ eventId, name }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
      >
        <FaRegSave />
        Als Vorlage speichern
      </Button2>

      {isOpen && (
        <Modal
          isOpen={true}
          onRequestClose={() => setIsOpen(false)}
          className="w-120"
          heading={<h2>Event als Vorlage speichern</h2>}
        >
          <SaveEventAsTemplateForm
            eventId={eventId}
            name={name}
            onSuccess={() => setIsOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

interface FormProps {
  readonly eventId: string;
  readonly name: string;
  readonly onSuccess: () => void;
}

const SaveEventAsTemplateForm = ({ eventId, name, onSuccess }: FormProps) => {
  /**
   * The errors show as toasts: the refresh after a conflict, for example an
   * event that a different manager deleted, can remove this form.
   */
  const { formAction } = useAction(createEventTemplateFromEvent, {
    onSuccess,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="sourceEventId" value={eventId} />

      <p className="mb-4 text-sm text-neutral-400">
        {`Die Vorlage übernimmt Beschreibung, Titelbild, Sichtbarkeit, Discord-Einstellungen, Aufstellung und Briefing von „${name}“, aber weder Teilnehmer noch Besetzung der Aufstellung. Sie gehört dir und ist damit zunächst nur für dich sichtbar.`}
      </p>

      <TextInput
        name="name"
        label="Name"
        defaultValue={name}
        maxLength={EVENT_TEMPLATE_NAME_MAX_LENGTH}
        required
        autoFocus
      />

      <div className="mt-8 flex justify-end">
        <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
      </div>
    </form>
  );
};
