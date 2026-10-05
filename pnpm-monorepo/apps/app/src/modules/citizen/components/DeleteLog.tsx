"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { api } from "@/trpc/react";
import { type CitizenLog } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteCitizenLog } from "../actions/deleteCitizenLog";

interface Props {
  readonly log: Pick<CitizenLog, "id" | "citizenId">;
}

export const DeleteLog = ({ log }: Props) => {
  const utils = api.useUtils();

  /**
   * The history modal shows a client query, which the refresh of the action
   * skips. Also after an error: then a different user possibly deleted the
   * log.
   */
  const deleteLogAndReloadHistory = async (formData: FormData) => {
    const response = await deleteCitizenLog(formData);
    await utils.citizenLog.getHistory.invalidate({ citizenId: log.citizenId });
    return response;
  };

  return (
    <ConfirmActionButton
      action={deleteLogAndReloadHistory}
      hiddenFields={[{ name: "id", value: log.id }]}
      trigger={(isPending) => (
        <Button
          title="Eintrag löschen"
          className="h-auto self-center"
          disabled={isPending}
          variant="tertiary"
          type="submit"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Eintrag löschen?"
      description="Willst du diesen Eintrag löschen?"
      confirmLabel="Löschen"
    />
  );
};
