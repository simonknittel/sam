"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaTrash } from "react-icons/fa";
import { deleteFlow } from "../actions/deleteFlow";

interface Props {
  readonly flowId: string;
  readonly name: string;
}

export const DeleteFlowButton = ({ flowId, name }: Props) => {
  return (
    <ConfirmActionButton
      action={deleteFlow}
      hiddenFields={[{ name: "flowId", value: flowId }]}
      trigger={(isPending) => (
        <Button2 type="button" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaTrash />}
          Löschen
        </Button2>
      )}
      title="Karrierebaum löschen?"
      description={`„${name}“ verschwindet aus der Navigation und ist nicht mehr aufrufbar. Knoten, Verbindungen und Berechtigungen bleiben erhalten und können über den Filter „Gelöscht“ wiederhergestellt werden.`}
      confirmLabel="Löschen"
    />
  );
};
