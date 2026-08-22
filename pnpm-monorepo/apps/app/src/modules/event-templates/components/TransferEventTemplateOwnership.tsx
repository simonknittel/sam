"use client";

import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import Note from "@/modules/common/components/Note";
import { FaExchangeAlt } from "react-icons/fa";
import { transferEventTemplateOwnership } from "../actions/transferEventTemplateOwnership";

interface Props {
  readonly templateId: string;
  readonly currentOwnerId: string | null;
}

export const TransferEventTemplateOwnership = ({
  templateId,
  currentOwnerId,
}: Props) => {
  return (
    <>
      <Note
        type="warning"
        className="mb-4"
        message="Die Freigaben bleiben unverändert. Wenn du selbst keine Rolle mit Zugriff hast und die Berechtigung „Events verwalten“ fehlt, verlierst du mit der Übertragung jeden Zugriff auf diese Vorlage."
      />

      <ConfirmActionButton
        action={transferEventTemplateOwnership}
        hiddenFields={[{ name: "templateId", value: templateId }]}
        trigger={(isPending) => (
          <Button2 type="button" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaExchangeAlt />}
            Besitz übertragen
          </Button2>
        )}
        title="Besitz übertragen?"
        description="Der ausgewählte Citizen wird Besitzer dieser Vorlage und kann sie teilen, löschen und weitergeben."
        confirmLabel="Übertragen"
      >
        {(formId) => (
          <CitizenInput
            form={formId}
            name="newOwnerId"
            defaultValue={currentOwnerId ?? undefined}
          />
        )}
      </ConfirmActionButton>
    </>
  );
};
