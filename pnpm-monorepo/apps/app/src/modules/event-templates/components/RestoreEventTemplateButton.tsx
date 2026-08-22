"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaTrashRestore } from "react-icons/fa";
import { restoreEventTemplate } from "../actions/restoreEventTemplate";

interface Props {
  readonly templateId: string;
  readonly name: string;
  /** Renders a labelled button instead of the table's icon-only one */
  readonly withLabel?: boolean;
}

export const RestoreEventTemplateButton = ({
  templateId,
  name,
  withLabel,
}: Props) => {
  return (
    <ConfirmActionButton
      action={restoreEventTemplate}
      hiddenFields={[{ name: "templateId", value: templateId }]}
      trigger={(isPending) =>
        withLabel ? (
          <Button2 type="button" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaTrashRestore />}
            Wiederherstellen
          </Button2>
        ) : (
          <Button2
            type="button"
            variant={Button2Variant.IconOnly}
            tooltip="Wiederherstellen"
            disabled={isPending}
          >
            {isPending ? <AsciiSpinner /> : <FaTrashRestore />}
          </Button2>
        )
      }
      title="Vorlage wiederherstellen?"
      description={`„${name}“ erscheint mit Aufstellung, Briefing und ihren Freigaben wieder in der Übersicht und in der Auswahl beim Erstellen eines Events.`}
      confirmLabel="Wiederherstellen"
    />
  );
};
