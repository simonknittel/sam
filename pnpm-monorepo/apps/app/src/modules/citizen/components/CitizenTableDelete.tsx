"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Entity } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly entity: Entity;
}

export const CitizenTableDelete = ({ entity }: Props) => {
  const router = useRouter();

  const deleteCitizen = async (formData: FormData) => {
    const response = await fetch(`/api/spynet/citizen/${entity.id}`, {
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
      action={deleteCitizen}
      trigger={(isPending) => (
        <Button disabled={isPending} variant="tertiary">
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Citizen löschen?"
      description="Willst du diesen Citizen komplett löschen?"
      confirmLabel="Löschen"
      onSuccess={() => router.refresh()}
    />
  );
};
