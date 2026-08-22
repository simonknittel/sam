"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { useState } from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { transferEventTemplateOwnership } from "../actions/transferEventTemplateOwnership";

interface Props {
  readonly templateId: string;
  readonly currentOwnerId: string | null;
}

/**
 * A plain modal rather than a confirm dialog: the citizen picker opens its
 * option list in a portal, which an alert dialog's overlay would swallow the
 * clicks of.
 */
export const TransferEventTemplateOwnership = ({
  templateId,
  currentOwnerId,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <p className="mb-4 text-sm text-neutral-400">
        Die Freigaben bleiben unverändert. Wenn du selbst keine Rolle mit
        Zugriff hast und die Berechtigung „Events verwalten“ fehlt, verlierst du
        mit der Übertragung jeden Zugriff auf diese Vorlage.
      </p>

      <Button2 type="button" onClick={() => setIsOpen(true)}>
        <FaExchangeAlt />
        Besitz übertragen
      </Button2>

      {isOpen && (
        <Modal
          isOpen={true}
          onRequestClose={() => setIsOpen(false)}
          className="w-120"
          heading={<h2>Besitz übertragen</h2>}
        >
          <TransferForm
            templateId={templateId}
            currentOwnerId={currentOwnerId}
            onSuccess={() => setIsOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

interface FormProps {
  readonly templateId: string;
  readonly currentOwnerId: string | null;
  readonly onSuccess: () => void;
}

const TransferForm = ({ templateId, currentOwnerId, onSuccess }: FormProps) => {
  const { state, formAction, isPending } = useAction(
    transferEventTemplateOwnership,
    { errorToast: false, onSuccess },
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="templateId" value={templateId} />

      <p className="mb-4 text-sm text-neutral-400">
        Der ausgewählte Citizen wird Besitzer dieser Vorlage und kann sie
        teilen, löschen und weitergeben.
      </p>

      <CitizenInput
        name="newOwnerId"
        defaultValue={currentOwnerId ?? undefined}
      />

      <ActionErrorNote className="mt-4" state={state} />

      <div className="mt-8 flex justify-end">
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaExchangeAlt />}
          Übertragen
        </Button2>
      </div>
    </form>
  );
};
