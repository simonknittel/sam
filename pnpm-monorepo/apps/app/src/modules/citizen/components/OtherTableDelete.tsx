"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type EntityLog } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly log: Pick<EntityLog, "id" | "entityId">;
}

export const OtherTableDelete = ({ log }: Props) => {
  const router = useRouter();

  const deleteLog = async (formData: FormData) => {
    const response = await fetch(
      `/api/spynet/citizen/${log.entityId}/log/${log.id}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok)
      return {
        error: "Beim Löschen ist ein Fehler aufgetreten.",
        requestPayload: formData,
      };

    return { success: "Erfolgreich gelöscht" };
  };

  return (
    <ConfirmActionButton
      action={deleteLog}
      trigger={(isPending) => (
        <Button
          title="Eintrag löschen"
          disabled={isPending}
          variant="tertiary"
          type="button"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Eintrag löschen?"
      description="Willst du diesen Eintrag löschen?"
      confirmLabel="Löschen"
      onSuccess={() => router.refresh()}
    />
  );
};
