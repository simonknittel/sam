"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { api } from "@/trpc/react";
import { type EntityLog } from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly log: Pick<EntityLog, "id" | "entityId" | "type">;
}

export const DeleteLog = ({ log }: Props) => {
  const router = useRouter();
  const utils = api.useUtils();

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

    await utils.entityLog.getHistory.invalidate({
      entityId: log.entityId,
      // @ts-expect-error Don't know how to improve this
      type: log.type,
    });

    return { success: "Erfolgreich gelöscht" };
  };

  return (
    <ConfirmActionButton
      action={deleteLog}
      trigger={(isPending) => (
        <Button
          title="Eintrag löschen"
          className="h-auto self-center"
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
