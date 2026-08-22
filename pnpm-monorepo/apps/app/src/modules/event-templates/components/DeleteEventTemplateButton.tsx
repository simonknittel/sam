"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaTrash } from "react-icons/fa";
import { deleteEventTemplate } from "../actions/deleteEventTemplate";

interface Props {
  readonly templateId: string;
  readonly name: string;
}

export const DeleteEventTemplateButton = ({ templateId, name }: Props) => {
  return (
    <ConfirmActionButton
      action={deleteEventTemplate}
      hiddenFields={[{ name: "templateId", value: templateId }]}
      trigger={(isPending) => (
        <Button2 type="button" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaTrash />}
          Löschen
        </Button2>
      )}
      title="Vorlage löschen?"
      description={`„${name}“ verschwindet aus allen Übersichten und aus der Auswahl beim Erstellen eines Events — auch für alle, für die sie freigegeben ist. Aufstellung, Briefing und Freigaben bleiben erhalten und lassen sich über den Filter „Gelöscht“ wiederherstellen. Bereits erstellte Events bleiben unberührt.`}
      confirmLabel="Löschen"
    />
  );
};
