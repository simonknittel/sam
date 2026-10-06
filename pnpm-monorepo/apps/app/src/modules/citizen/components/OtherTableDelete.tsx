"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type CitizenLog } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteCitizenLog } from "../actions/deleteCitizenLog";

interface Props {
  readonly log: Pick<CitizenLog, "id">;
}

export const OtherTableDelete = ({ log }: Props) => {
  return (
    <ConfirmActionButton
      action={deleteCitizenLog}
      hiddenFields={[{ name: "id", value: log.id }]}
      trigger={(isPending) => (
        <Button
          title="Eintrag löschen"
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
