"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaTrash } from "react-icons/fa";
import type { SettingsRecord } from "./SettingsRecord";

interface Props {
  readonly action: (formData: FormData) => Promise<ActionResponse>;
  readonly record: SettingsRecord;
}

export const DeleteSettingsRecord = ({ action, record }: Props) => {
  return (
    <ConfirmActionButton
      action={action}
      hiddenFields={[{ name: "id", value: record.id }]}
      trigger={(isPending) => (
        <Button disabled={isPending} variant="tertiary">
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Eintrag löschen?"
      description={
        <>
          Willst du <span className="font-bold">{record.name}</span> löschen?
        </>
      }
      confirmLabel="Löschen"
    />
  );
};
