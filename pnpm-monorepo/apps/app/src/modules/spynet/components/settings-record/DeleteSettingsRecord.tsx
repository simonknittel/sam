"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import type { SettingsRecord } from "./SettingsRecord";

interface Props {
  readonly apiPath: string;
  readonly record: SettingsRecord;
}

export const DeleteSettingsRecord = ({ apiPath, record }: Props) => {
  const router = useRouter();

  const deleteRecord = async (formData: FormData) => {
    const response = await fetch(`${apiPath}/${record.id}`, {
      method: "DELETE",
    });

    if (!response.ok)
      return {
        error: "Beim Löschen ist ein Fehler aufgetreten.",
        requestPayload: formData,
      };

    return { success: "Erfolgreich gelöscht" };
  };

  return (
    <ConfirmActionButton
      action={deleteRecord}
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
      onSuccess={() => router.refresh()}
    />
  );
};
